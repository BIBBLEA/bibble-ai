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
 */
export async function deductCredit(
  userId: string,
  videoId: string
): Promise<number | null> {
  // Récupérer le solde actuel
  const currentBalance = await getCreditsBalance(userId);

  if (currentBalance <= 0) {
    return null; // Pas assez de crédits
  }

  const newBalance = currentBalance - 1;

  // Mettre à jour le solde
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", userId);

  if (updateError) return null;

  // Enregistrer la transaction
  const { error: transactionError } = await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id: userId,
      type: "usage_debit" as const,
      amount: -1,
      balance_after: newBalance,
      description: "Génération de vidéo",
      reference_id: videoId,
    });

  if (transactionError) {
    console.error("Erreur lors de l'enregistrement de la transaction:", transactionError);
  }

  return newBalance;
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
  // Mettre à jour le solde avec les nouveaux crédits
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ credits })
    .eq("id", userId);

  if (updateError) return false;

  // Enregistrer la transaction
  const { error: transactionError } = await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id: userId,
      type: "subscription_credit" as const,
      amount: credits,
      balance_after: credits,
      description: `Renouvellement abonnement — ${credits} crédits attribués`,
      reference_id: subscriptionId,
    });

  if (transactionError) {
    console.error("Erreur lors de l'enregistrement de la transaction:", transactionError);
  }

  return true;
}

/**
 * Attribue des crédits manuellement (admin)
 */
export async function grantManualCredits(
  userId: string,
  credits: number,
  description: string
): Promise<boolean> {
  const currentBalance = await getCreditsBalance(userId);
  const newBalance = currentBalance + credits;

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", userId);

  if (updateError) return false;

  const { error: transactionError } = await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id: userId,
      type: "manual_credit" as const,
      amount: credits,
      balance_after: newBalance,
      description,
    });

  if (transactionError) {
    console.error("Erreur lors de l'enregistrement de la transaction:", transactionError);
  }

  return true;
}
