import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Database } from "@/types/database";

// ============================================
// POST /api/webhooks/stripe
// ============================================
// Webhook Stripe pour gérer les événements d'abonnement :
// - checkout.session.completed → Nouvel abonnement
// - invoice.payment_succeeded → Renouvellement mensuel (crédits)
// - customer.subscription.updated → Changement de plan
// - customer.subscription.deleted → Annulation
// ============================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Mapping des Price IDs vers les plans et crédits
const PLAN_CONFIG: Record<
  string,
  { plan: "starter" | "growth" | "pro"; credits: number }
> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY || ""]: { plan: "starter", credits: 2 },
  [process.env.STRIPE_PRICE_STARTER_ANNUAL || ""]: { plan: "starter", credits: 2 },
  [process.env.STRIPE_PRICE_GROWTH_MONTHLY || ""]: { plan: "growth", credits: 6 },
  [process.env.STRIPE_PRICE_GROWTH_ANNUAL || ""]: { plan: "growth", credits: 6 },
  [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: { plan: "pro", credits: 15 },
  [process.env.STRIPE_PRICE_PRO_ANNUAL || ""]: { plan: "pro", credits: 15 },
};

function getPlanFromPriceId(priceId: string) {
  return PLAN_CONFIG[priceId] || null;
}

// Helper: get current_period from subscription items
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) return { start: null, end: null };
  return {
    start: new Date(item.current_period_end * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // --- Vérifier la signature du webhook ---
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // --- Client Supabase admin ---
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --- Traiter les événements ---
    switch (event.type) {
      // ==========================================
      // CHECKOUT COMPLÉTÉ → Nouvel abonnement
      // ==========================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          console.error("Missing userId or subscriptionId in checkout session");
          break;
        }

        // Récupérer les détails de l'abonnement
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = subscriptionResponse as unknown as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const planConfig = getPlanFromPriceId(priceId);

        if (!planConfig) {
          console.error("Unknown priceId:", priceId);
          break;
        }

        const period = getSubscriptionPeriod(subscription);

        // Mettre à jour le profil utilisateur
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: planConfig.plan,
            credits: planConfig.credits,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId);

        // Créer/mettre à jour l'entrée dans subscriptions
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          plan: planConfig.plan,
          status: "active",
          credits_per_period: planConfig.credits,
          current_period_start: period.start,
          current_period_end: period.end,
        });

        // Enregistrer la transaction de crédits
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          type: "subscription_credit",
          amount: planConfig.credits,
          balance_after: planConfig.credits,
          description: `Abonnement ${planConfig.plan} — ${planConfig.credits} crédits attribués`,
          reference_id: subscriptionId,
        });

        console.log(
          `✅ Checkout completed: ${userId} → ${planConfig.plan} (${planConfig.credits} crédits)`
        );
        break;
      }

      // ==========================================
      // PAIEMENT RÉUSSI → Renouvellement mensuel
      // ==========================================
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Ignorer la première facture (déjà gérée par checkout.session.completed)
        if (invoice.billing_reason === "subscription_create") {
          break;
        }

        // Récupérer le subscription ID depuis parent.subscription_details
        const subscriptionId =
          (invoice.parent?.subscription_details?.subscription as string) || null;
        if (!subscriptionId) break;

        // Récupérer l'abonnement
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = subscriptionResponse as unknown as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items.data[0]?.price.id;
        const planConfig = getPlanFromPriceId(priceId);

        if (!userId || !planConfig) {
          console.error("Missing data for invoice.payment_succeeded");
          break;
        }

        const period = getSubscriptionPeriod(subscription);

        // Réattribuer les crédits (NON CUMULATIF = reset au montant du plan)
        await supabaseAdmin
          .from("profiles")
          .update({
            credits: planConfig.credits,
          })
          .eq("id", userId);

        // Mettre à jour la période dans subscriptions
        await supabaseAdmin
          .from("subscriptions")
          .update({
            current_period_start: period.start,
            current_period_end: period.end,
            status: "active",
          })
          .eq("stripe_subscription_id", subscriptionId);

        // Enregistrer la transaction
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          type: "subscription_credit",
          amount: planConfig.credits,
          balance_after: planConfig.credits,
          description: `Renouvellement ${planConfig.plan} — ${planConfig.credits} crédits réattribués`,
          reference_id: subscriptionId,
        });

        console.log(
          `🔄 Renewal: ${userId} → ${planConfig.credits} crédits réattribués`
        );
        break;
      }

      // ==========================================
      // ABONNEMENT MIS À JOUR → Changement de plan
      // ==========================================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items.data[0]?.price.id;
        const planConfig = getPlanFromPriceId(priceId);

        if (!userId || !planConfig) break;

        // Vérifier si c'est un changement de plan (pas juste un renouvellement)
        const previousAttributes = event.data
          .previous_attributes as Record<string, unknown>;
        const prevItems = previousAttributes?.items as
          | { data?: Array<{ price?: { id?: string } }> }
          | undefined;
        const previousPriceId = prevItems?.data?.[0]?.price?.id;

        if (previousPriceId && previousPriceId !== priceId) {
          // C'est un vrai changement de plan
          await supabaseAdmin
            .from("profiles")
            .update({
              plan: planConfig.plan,
              credits: planConfig.credits,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", userId);

          await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: planConfig.plan,
              credits_per_period: planConfig.credits,
              status: subscription.status === "active" ? "active" : "past_due",
            })
            .eq("stripe_subscription_id", subscription.id);

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            type: "subscription_credit",
            amount: planConfig.credits,
            balance_after: planConfig.credits,
            description: `Changement de plan → ${planConfig.plan} — ${planConfig.credits} crédits`,
            reference_id: subscription.id,
          });

          console.log(
            `📝 Plan changed: ${userId} → ${planConfig.plan}`
          );
        }
        break;
      }

      // ==========================================
      // ABONNEMENT ANNULÉ
      // ==========================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) break;

        // Rétrograder vers le plan "free" (0 crédits)
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: null,
            credits: 0,
            stripe_subscription_id: null,
          })
          .eq("id", userId);

        // Mettre à jour le statut de l'abonnement
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`❌ Subscription cancelled: ${userId}`);
        break;
      }

      default:
        // Événement non géré — on l'ignore silencieusement
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
