import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Database } from "@/types/database";
import { appliquerQuota, cleUtilisateur } from "@/lib/rate-limit";

// ============================================
// POST /api/account/delete
// ============================================
// Suppression définitive du compte de l'utilisateur connecté (RGPD).
//
// Ordre de suppression et clés étrangères :
//   auth.users
//     └─ profiles.id           REFERENCES auth.users(id)     ON DELETE CASCADE
//          ├─ video_generations.user_id  REFERENCES profiles(id) ON DELETE CASCADE
//          ├─ credit_transactions.user_id REFERENCES profiles(id) ON DELETE CASCADE
//          └─ subscriptions.user_id       REFERENCES profiles(id) ON DELETE CASCADE
// (voir supabase/migrations/001_initial_schema.sql)
// Toute la chaîne est en ON DELETE CASCADE : supprimer l'utilisateur dans
// auth.users suffit à effacer le profil puis les vidéos, les transactions de
// crédits et les abonnements. Aucune suppression manuelle n'est nécessaire,
// et en faire une introduirait un risque de suppression partielle en cas
// d'échec à mi-parcours.
//
// Abonnement Stripe : on ne résilie JAMAIS l'abonnement à la place de
// l'utilisateur. Supprimer le compte sans annuler côté Stripe laisserait un
// abonnement facturé sans compte associé (et les webhooks suivants ne
// trouveraient plus de profil). On refuse donc la suppression tant qu'un
// abonnement est actif et on renvoie l'utilisateur vers /dashboard/billing,
// qui ouvre le portail client Stripe — seul endroit où la résiliation est
// tracée côté facturation.
// ============================================

export async function POST() {
  try {
    // --- Authentification (session par cookies) ---
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // Limitation de débit : action irréversible et en cascade sur quatre
    // tables. La route n'a pas de paramètre `request` (session par cookies) :
    // la clé est l'identifiant de l'utilisateur, ce qui est de toute façon la
    // bonne granularité ici — c'est son compte qui est en jeu.
    const limite = await appliquerQuota(
      "suppression_compte",
      cleUtilisateur(user.id)
    );
    if (limite) return limite;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY manquante");
      return NextResponse.json(
        { error: "Configuration serveur incomplète. Contactez le support." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // --- Garde-fou : abonnement Stripe encore actif ---
    const { data: activeSubscriptions, error: subscriptionError } =
      await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"]);

    if (subscriptionError) {
      console.error("Erreur lecture subscriptions:", subscriptionError);
      return NextResponse.json(
        { error: "Impossible de vérifier votre abonnement. Réessayez." },
        { status: 500 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (
      (activeSubscriptions && activeSubscriptions.length > 0) ||
      profile?.stripe_subscription_id
    ) {
      return NextResponse.json(
        {
          error:
            "Votre abonnement est toujours actif. Résiliez-le d'abord depuis « Mon abonnement » (portail Stripe), puis revenez supprimer votre compte.",
        },
        { status: 409 }
      );
    }

    // --- Suppression : la cascade fait le reste ---
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Erreur suppression utilisateur:", deleteError);
      return NextResponse.json(
        { error: "La suppression du compte a échoué. Réessayez plus tard." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account delete error:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
