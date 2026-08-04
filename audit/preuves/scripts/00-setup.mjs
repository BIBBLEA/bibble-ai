import {
  COMPTE_A,
  COMPTE_B,
  VIDEO_DE_A,
  VIDEO_DE_B,
  clientAdmin,
  log,
  titre,
  urlSupabase,
} from "./_lib.mjs";

// ============================================
// Préparation du jeu de données de preuve
// ============================================
// Crée deux comptes (A = attaquant, B = victime), leur donne 2 crédits chacun
// et une vidéo chacun. Idempotent : rejouable autant de fois que nécessaire,
// il remet l'environnement dans l'état de départ.
// ============================================

const admin = clientAdmin();

async function recreerCompte(compte) {
  const { data: liste, error: erreurListe } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (erreurListe) throw new Error(`listUsers : ${erreurListe.message}`);

  const existant = liste.users.find((u) => u.email === compte.email);
  if (existant) {
    // Suppression en cascade (profiles, video_generations, credit_transactions)
    const { error } = await admin.auth.admin.deleteUser(existant.id);
    if (error) throw new Error(`deleteUser : ${error.message}`);
    log(`${compte.libelle} — ancien compte supprimé (${existant.id})`);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: compte.email,
    password: compte.password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser : ${error.message}`);

  log(`${compte.libelle} — créé : ${data.user.id}`);
  return data.user;
}

async function preparerProfil(user, credits) {
  // Le trigger on_auth_user_created a déjà inséré le profil avec 0 crédit.
  const { error } = await admin
    .from("profiles")
    .update({ credits, plan: "starter" })
    .eq("id", user.id);
  if (error) throw new Error(`update profiles : ${error.message}`);
  log(`  → solde initialisé à ${credits} crédits, plan « starter »`);
}

async function creerVideo(user, heygenVideoId) {
  const { error } = await admin.from("video_generations").insert({
    user_id: user.id,
    heygen_video_id: heygenVideoId,
    script: "Script de démonstration pour les preuves d'audit.",
    avatar_id: "avatar_preuve",
    voice_id: "voice_preuve",
    format: "9:16",
    status: "completed",
    video_url: "https://exemple.invalid/video-de-demonstration.mp4",
  });
  if (error) throw new Error(`insert video_generations : ${error.message}`);
  log(`  → vidéo « ${heygenVideoId} » créée`);
}

titre("00 — Préparation du jeu de données de preuve");
log(`Cible Supabase : ${urlSupabase()}`);

const utilisateurA = await recreerCompte(COMPTE_A);
await preparerProfil(utilisateurA, 2);
await creerVideo(utilisateurA, VIDEO_DE_A);

const utilisateurB = await recreerCompte(COMPTE_B);
await preparerProfil(utilisateurB, 2);
await creerVideo(utilisateurB, VIDEO_DE_B);

console.log("");
log("Environnement prêt :");
log(`  A (attaquant) : ${COMPTE_A.email} — ${utilisateurA.id}`);
log(`  B (victime)   : ${COMPTE_B.email} — ${utilisateurB.id}`);
console.log("");
console.log("Identifiants écrits dans audit/preuves/scripts/.comptes.json");

const { writeFile } = await import("node:fs/promises");
await writeFile(
  new URL("./.comptes.json", import.meta.url),
  JSON.stringify(
    { a: { ...COMPTE_A, id: utilisateurA.id }, b: { ...COMPTE_B, id: utilisateurB.id } },
    null,
    2
  ) + "\n"
);
