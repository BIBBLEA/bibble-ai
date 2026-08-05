import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { Database } from "@/types/database";
import { appliquerQuota, cleUtilisateur } from "@/lib/rate-limit";

// ============================================
// POST /api/stripe/checkout
// ============================================
// Crée une Stripe Checkout Session pour un abonnement
// Body: { priceId: string }
// ============================================

export async function POST(request: NextRequest) {
  try {
    // --- Authentification ---
    const authHeader = request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader || "" },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    // --- Limitation de débit ---
    // Chaque appel crée un client et une session de paiement chez Stripe, et
    // consomme le quota d'API de notre compte Stripe.
    const limite = await appliquerQuota(
      "paiement_stripe",
      cleUtilisateur(user.id)
    );
    if (limite) return limite;

    // --- Récupérer le priceId ---
    const body = await request.json();
    const { priceId } = body;

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "Le priceId est requis." },
        { status: 400 }
      );
    }

    // --- Récupérer ou créer le customer Stripe ---
    const supabaseAdmin = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Créer un nouveau customer Stripe
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || "",
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Sauvegarder le customer_id dans le profil
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // --- Créer la Checkout Session ---
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id,
      },
    });
  } catch (error) {
    console.error("Error in /api/stripe/checkout:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement." },
      { status: 500 }
    );
  }
}
