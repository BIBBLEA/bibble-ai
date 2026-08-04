import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { Database } from "@/types/database";

// ============================================
// POST /api/stripe/portal
// ============================================
// Crée un lien vers le portail client Stripe
// Permet à l'utilisateur de gérer son abonnement
// (changer de plan, annuler, mettre à jour la carte)
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

    // --- Récupérer le customer Stripe ---
    const supabaseAdmin = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Aucun abonnement trouvé. Veuillez d'abord souscrire un plan." },
        { status: 400 }
      );
    }

    // --- Créer la session du portail ---
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({
      success: true,
      data: {
        portal_url: portalSession.url,
      },
    });
  } catch (error) {
    console.error("Error in /api/stripe/portal:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du portail." },
      { status: 500 }
    );
  }
}
