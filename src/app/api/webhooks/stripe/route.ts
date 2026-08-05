import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { construireTableTarifs, stripe } from "@/lib/stripe";
import { Database } from "@/types/database";

// ============================================
// POST /api/webhooks/stripe
// ============================================
// Webhook Stripe pour gérer les événements d'abonnement :
// - checkout.session.completed → Nouvel abonnement
// - invoice.payment_succeeded → Renouvellement mensuel (crédits)
// - customer.subscription.updated → Changement de plan
// - customer.subscription.deleted → Annulation
//
// Chaque événement n'est traité qu'une fois : son `event.id` est enregistré
// dans la table stripe_events (migration 005) en tête de traitement.
// ============================================

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

type PlanTarifaire = { plan: "starter" | "growth" | "pro"; credits: number };

// Mapping des Price IDs vers les plans et crédits.
// construireTableTarifs écarte les tarifs dont la variable d'environnement n'est
// pas renseignée : sans ce filtre, chaque variable absente créait la clé "" et
// les absences s'écrasaient entre elles, ne laissant qu'une entrée vide créditée
// au tarif du dernier plan déclaré (voir src/lib/stripe.ts).
const PLAN_CONFIG: Record<string, PlanTarifaire> = construireTableTarifs<PlanTarifaire>([
  { variable: "STRIPE_PRICE_STARTER_MONTHLY", priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY, valeur: { plan: "starter", credits: 2 } },
  { variable: "STRIPE_PRICE_STARTER_ANNUAL", priceId: process.env.STRIPE_PRICE_STARTER_ANNUAL, valeur: { plan: "starter", credits: 2 } },
  { variable: "STRIPE_PRICE_GROWTH_MONTHLY", priceId: process.env.STRIPE_PRICE_GROWTH_MONTHLY, valeur: { plan: "growth", credits: 6 } },
  { variable: "STRIPE_PRICE_GROWTH_ANNUAL", priceId: process.env.STRIPE_PRICE_GROWTH_ANNUAL, valeur: { plan: "growth", credits: 6 } },
  { variable: "STRIPE_PRICE_PRO_MONTHLY", priceId: process.env.STRIPE_PRICE_PRO_MONTHLY, valeur: { plan: "pro", credits: 15 } },
  { variable: "STRIPE_PRICE_PRO_ANNUAL", priceId: process.env.STRIPE_PRICE_PRO_ANNUAL, valeur: { plan: "pro", credits: 15 } },
], "PLAN_CONFIG (webhook)");

function getPlanFromPriceId(priceId: string | undefined): PlanTarifaire | null {
  if (!priceId) return null;
  return PLAN_CONFIG[priceId] || null;
}

// Helper: get current_period from subscription items
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) return { start: null, end: null };
  return {
    start: new Date(item.current_period_start * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

type ClientAdmin = SupabaseClient<Database>;

// --- Libérer un événement réclamé mais non traité ---
// Retire la ligne de déduplication pour qu'un rejeu — automatique après un 500,
// ou déclenché à la main depuis le tableau de bord Stripe — puisse reprendre le
// traitement. Sans cela l'événement serait définitivement perdu : la ligne dirait
// « déjà traité » alors que rien ne l'a été.
async function libererEvenement(supabaseAdmin: ClientAdmin, eventId: string) {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error(
      `🚨 Événement ${eventId} : traitement échoué ET libération impossible ` +
        `(${error.message}) — tout rejeu sera pris pour un doublon, reprise manuelle requise.`
    );
  }
}

// --- Tarif absent de la table des tarifs ---
// Le paiement est encaissé côté Stripe mais aucun crédit ne peut être attribué :
// c'est une anomalie de configuration (variable STRIPE_PRICE_* manquante ou
// tarif créé dans Stripe sans être déclaré ici). Auparavant ce cas sortait par
// un simple `break` : Stripe recevait 200 et l'abonné n'était jamais crédité,
// sans la moindre alerte.
//
// On répond 202 : c'est un 2xx, donc Stripe ne rejoue pas en boucle, mais le
// code se distingue nettement du 200 nominal dans le tableau de bord Stripe
// comme dans les journaux. L'événement est libéré, de sorte qu'un renvoi manuel
// après correction des variables d'environnement soit bien retraité.
async function signalerTarifInconnu(
  supabaseAdmin: ClientAdmin,
  event: Stripe.Event,
  priceId: string | undefined,
  userId: string | null | undefined
) {
  console.error(
    `🚨 ALERTE tarif Stripe inconnu — event ${event.id} (${event.type}) : ` +
      `priceId « ${priceId ?? "(absent)"} » ne figure pas dans PLAN_CONFIG. ` +
      `Utilisateur ${userId ?? "(inconnu)"} NON CRÉDITÉ. ` +
      `Tarifs déclarés : ${Object.keys(PLAN_CONFIG).length}. ` +
      `Vérifier les variables STRIPE_PRICE_* de l'environnement.`
  );

  await libererEvenement(supabaseAdmin, event.id);

  return NextResponse.json(
    {
      received: true,
      processed: false,
      reason: "unknown_price_id",
      price_id: priceId ?? null,
      event_id: event.id,
    },
    { status: 202 }
  );
}

// --- Écriture critique : toute erreur doit faire échouer le traitement ---
// supabase-js ne lève pas d'exception, il RETOURNE l'erreur. Une écriture
// échouée mais non contrôlée laissait donc la réclamation en place et répondait
// 200 : l'abonné payait sans être crédité, et tout rejeu — même manuel — était
// pris pour un doublon. Lever ici fait tomber dans le catch, qui libère
// l'événement et répond 500 pour que Stripe rejoue.
function exiger(erreur: { message: string } | null, contexte: string): void {
  if (erreur) {
    throw new Error(`${contexte} : ${erreur.message}`);
  }
}

// --- Remise des crédits au montant du plan ---
// Passe par grant_credits (004_credits_atomiques.sql) : solde et ligne de
// journal sont écrits dans la même transaction, ils ne peuvent pas diverger.
// Retour false = profil introuvable (compte supprimé entre le paiement et la
// notification) : il n'y a personne à créditer, l'événement est acquitté sans
// rejeu. Toute autre défaillance est levée — le catch libère l'événement et le
// 500 fait rejouer Stripe.
async function remettreCredits(
  supabaseAdmin: ClientAdmin,
  userId: string,
  credits: number,
  description: string,
  referenceId: string,
  contexte: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: credits,
    p_mode: "reset",
    p_description: description,
    p_reference_id: referenceId,
  });

  if (error) {
    throw new Error(
      `${contexte} — attribution des crédits impossible : ${error.message}`
    );
  }

  if (!data?.success) {
    if (data?.reason === "profile_not_found") {
      console.error(
        `⚠️ ${contexte} — profil ${userId} introuvable : compte supprimé, aucun crédit attribué.`
      );
      return false;
    }
    throw new Error(
      `${contexte} — attribution des crédits refusée (${data?.reason ?? "réponse vide"})`
    );
  }

  return true;
}

export async function POST(request: NextRequest) {
  // --- Client Supabase admin ---
  // Créé hors du bloc try : le catch doit pouvoir libérer l'événement réclamé.
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Identifiant de l'événement dont ce traitement détient la réclamation.
  let evenementReclame: string | null = null;

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

    // ==========================================
    // IDEMPOTENCE — réclamer l'événement
    // ==========================================
    // Stripe rejoue une notification tant qu'il n'obtient pas de 2xx (et le
    // handler déclenchait lui-même ces rejeux en répondant 500). Sans garde-fou,
    // chaque rejeu réattribuait le plein montant de crédits du plan.
    //
    // L'insertion de l'`event.id` est faite AVANT tout traitement, et non après :
    // c'est elle qui « réclame » l'événement. La clé primaire de stripe_events
    // rend la réclamation atomique — deux livraisons simultanées du même
    // événement ne peuvent pas réussir toutes les deux.
    const { error: erreurReclamation } = await supabaseAdmin
      .from("stripe_events")
      .insert({ id: event.id, type: event.type });

    if (erreurReclamation) {
      // 23505 = violation de clé primaire : l'événement a déjà été réclamé.
      if (erreurReclamation.code === "23505") {
        console.log(
          `↩️ Événement déjà traité, rejeu ignoré : ${event.id} (${event.type})`
        );
        return NextResponse.json(
          { received: true, duplicate: true },
          { status: 200 }
        );
      }

      // Toute autre erreur (table absente, base injoignable) : on refuse de
      // traiter sans garde-fou. Le 500 fait rejouer Stripe, qui retentera une
      // fois la base de nouveau disponible.
      console.error(
        "Impossible d'enregistrer l'événement Stripe (traitement refusé) :",
        erreurReclamation
      );
      return NextResponse.json(
        { error: "Event deduplication unavailable" },
        { status: 500 }
      );
    }

    // Réclamation obtenue. Si le traitement échoue plus bas, elle sera relâchée
    // (voir libererEvenement) : conserver la ligne signerait un traitement qui
    // n'a pas eu lieu et l'abonné ne serait jamais crédité. Les écritures
    // effectuées ici sont rejouables sans dommage — le solde est *remis* au
    // montant du plan par grant_credits (et non incrémenté), le journal part
    // dans la même transaction que le solde, et les écritures subscriptions
    // sont des upserts ou des updates idempotents.
    evenementReclame = event.id;

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
          return await signalerTarifInconnu(supabaseAdmin, event, priceId, userId);
        }

        const period = getSubscriptionPeriod(subscription);

        // Rattacher le client et l'abonnement Stripe au profil. Les crédits ne
        // sont pas écrits ici : remettreCredits s'en charge en dernier, solde
        // et journal dans la même transaction.
        const { error: erreurProfil } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: planConfig.plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId);
        exiger(erreurProfil, "checkout.session.completed — mise à jour du profil");

        // Créer/mettre à jour l'entrée dans subscriptions
        const { error: erreurAbonnement } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            plan: planConfig.plan,
            status: "active",
            credits_per_period: planConfig.credits,
            current_period_start: period.start,
            current_period_end: period.end,
          });
        exiger(erreurAbonnement, "checkout.session.completed — upsert subscriptions");

        const credite = await remettreCredits(
          supabaseAdmin,
          userId,
          planConfig.credits,
          `Abonnement ${planConfig.plan} — ${planConfig.credits} crédits attribués`,
          subscriptionId,
          "checkout.session.completed"
        );

        if (credite) {
          console.log(
            `✅ Checkout completed: ${userId} → ${planConfig.plan} (${planConfig.credits} crédits)`
          );
        }
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
        if (!subscriptionId) {
          console.error(
            `⚠️ invoice.payment_succeeded sans abonnement rattaché — event ${event.id}, facture ${invoice.id}`
          );
          break;
        }

        // Récupérer l'abonnement
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = subscriptionResponse as unknown as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items.data[0]?.price.id;
        const planConfig = getPlanFromPriceId(priceId);

        if (!planConfig) {
          return await signalerTarifInconnu(supabaseAdmin, event, priceId, userId);
        }

        if (!userId) {
          console.error(
            `⚠️ invoice.payment_succeeded — abonnement ${subscriptionId} sans` +
              ` metadata.supabase_user_id : aucun compte à créditer (event ${event.id})`
          );
          break;
        }

        const period = getSubscriptionPeriod(subscription);

        // Mettre à jour la période dans subscriptions
        const { error: erreurPeriode } = await supabaseAdmin
          .from("subscriptions")
          .update({
            current_period_start: period.start,
            current_period_end: period.end,
            status: "active",
          })
          .eq("stripe_subscription_id", subscriptionId);
        exiger(erreurPeriode, "invoice.payment_succeeded — mise à jour de la période");

        // Réattribuer les crédits (NON CUMULATIF : remise au montant du plan)
        const credite = await remettreCredits(
          supabaseAdmin,
          userId,
          planConfig.credits,
          `Renouvellement ${planConfig.plan} — ${planConfig.credits} crédits réattribués`,
          subscriptionId,
          "invoice.payment_succeeded"
        );

        if (credite) {
          console.log(
            `🔄 Renewal: ${userId} → ${planConfig.credits} crédits réattribués`
          );
        }
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

        if (!planConfig) {
          return await signalerTarifInconnu(supabaseAdmin, event, priceId, userId);
        }

        if (!userId) {
          console.error(
            `⚠️ customer.subscription.updated — abonnement ${subscription.id} sans` +
              ` metadata.supabase_user_id : aucun compte à mettre à jour (event ${event.id})`
          );
          break;
        }

        // Vérifier si c'est un changement de plan (pas juste un renouvellement)
        const previousAttributes = event.data
          .previous_attributes as Record<string, unknown>;
        const prevItems = previousAttributes?.items as
          | { data?: Array<{ price?: { id?: string } }> }
          | undefined;
        const previousPriceId = prevItems?.data?.[0]?.price?.id;

        if (previousPriceId && previousPriceId !== priceId) {
          // C'est un vrai changement de plan
          const { error: erreurProfil } = await supabaseAdmin
            .from("profiles")
            .update({
              plan: planConfig.plan,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", userId);
          exiger(erreurProfil, "customer.subscription.updated — mise à jour du profil");

          const { error: erreurAbonnement } = await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: planConfig.plan,
              credits_per_period: planConfig.credits,
              status: subscription.status === "active" ? "active" : "past_due",
            })
            .eq("stripe_subscription_id", subscription.id);
          exiger(erreurAbonnement, "customer.subscription.updated — mise à jour de subscriptions");

          const credite = await remettreCredits(
            supabaseAdmin,
            userId,
            planConfig.credits,
            `Changement de plan → ${planConfig.plan} — ${planConfig.credits} crédits`,
            subscription.id,
            "customer.subscription.updated"
          );

          if (credite) {
            console.log(`📝 Plan changed: ${userId} → ${planConfig.plan}`);
          }
        }
        break;
      }

      // ==========================================
      // ABONNEMENT ANNULÉ
      // ==========================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error(
            `⚠️ customer.subscription.deleted — abonnement ${subscription.id} sans` +
              ` metadata.supabase_user_id : aucun compte à rétrograder (event ${event.id})`
          );
          break;
        }

        // Rétrograder vers le plan "free" (0 crédits)
        const { error: erreurProfil } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: null,
            credits: 0,
            stripe_subscription_id: null,
          })
          .eq("id", userId);
        exiger(erreurProfil, "customer.subscription.deleted — rétrogradation du profil");

        // Mettre à jour le statut de l'abonnement
        const { error: erreurAbonnement } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);
        exiger(erreurAbonnement, "customer.subscription.deleted — clôture de subscriptions");

        console.log(`❌ Subscription cancelled: ${userId}`);
        break;
      }

      default:
        // Événement non géré. Il est acquitté (200) pour que Stripe cesse de le
        // livrer, mais il est journalisé : c'est la seule trace permettant de
        // repérer qu'un type d'événement souscrit dans le tableau de bord Stripe
        // n'a pas de traitement côté application.
        console.warn(
          `⚠️ Événement Stripe non géré : ${event.type} (event ${event.id}, ` +
            `émis le ${new Date(event.created * 1000).toISOString()}) — acquitté sans traitement`
        );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);

    // Le traitement a échoué après la réclamation : on la relâche pour que le
    // rejeu provoqué par ce 500 reprenne l'événement au lieu de le confondre
    // avec un doublon.
    if (evenementReclame) {
      await libererEvenement(supabaseAdmin, evenementReclame);
    }

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
