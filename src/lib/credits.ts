import { supabaseAdmin } from "./supabase";

/**
 * Vérifie si un utilisateur a suffisamment de crédits
 */
export async function hasCredits(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!data) return false;
  return data.credits > 0;
}

/**
 * Récupère le solde de crédits d'un utilisateur
 */
export async function getCreditsBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!data) return 0;
  return data.credits;
}

/**
 * Déduit 1 crédit pour une génération de vidéo
 * Retourne le nouveau solde ou null en cas d'erreur
 *
 * Le débit et l'écriture de la transaction sont faits en base par
 * `consume_credit` (004_credits_atomiques.sql) : plus de lecture-puis-écriture,
 * donc plus de course entre deux générations simultanées.
 */
export async function deductCredit(
  userId: string,
  videoId: string
): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc("consume_credit", {
    p_user_id: userId,
    p_video_id: videoId,
  });

  if (error) {
    console.error("Erreur lors de la consommation du crédit:", error);
    return null;
  }

  // Solde insuffisant ou profil introuvable : l'appelant traite le null
  // exactement comme avant.
  if (!data?.success) return null;

  return data.balance;
}

/**
 * Attribue des crédits lors d'un renouvellement d'abonnement
 * Les crédits sont REMIS À ZÉRO puis réattribués (pas cumulatifs)
 */
export async function grantSubscriptionCredits(
  userId: string,
  credits: number,
  subscriptionId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: credits,
    p_mode: "reset",
    p_description: `Renouvellement abonnement — ${credits} crédits attribués`,
    p_reference_id: subscriptionId,
  });

  if (error) {
    console.error("Erreur lors de l'attribution des crédits d'abonnement:", error);
    return false;
  }

  return data?.success === true;
}

/**
 * Attribue des crédits manuellement (admin)
 */
export async function grantManualCredits(
  userId: string,
  credits: number,
  description: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: credits,
    p_mode: "add",
    p_description: description,
    p_reference_id: null,
  });

  if (error) {
    console.error("Erreur lors de l'attribution manuelle des crédits:", error);
    return false;
  }

  return data?.success === true;
}
