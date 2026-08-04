import {
  COMPTE_A,
  clientAdmin,
  log,
  seConnecter,
  titre,
  verdict,
} from "./_lib.mjs";

// ============================================
// PREUVE 06 — Course aux crédits (read-then-write non transactionnel)
// ============================================
// Faille visée : audit/plan-implementation.md § B1.3 et B1.6
// Origine      : src/app/api/generate-video/route.ts:98-181
//
//   const { data: profile } = await supabaseAdmin
//     .from("profiles").select("credits, plan").eq("id", user.id).single();   ← lecture
//   if (profile.credits <= 0) return 403;
//   ... await fetch(HEYGEN /v3/videos) ...                                    ← plusieurs secondes
//   const newBalance = profile.credits - 1;                                   ← écriture
//   await supabaseAdmin.from("profiles").update({ credits: newBalance })...
//
// Entre la lecture et l'écriture s'intercale un appel réseau de plusieurs
// secondes. N requêtes lancées en parallèle lisent toutes le même solde, passent
// toutes le contrôle, et écrivent toutes la même valeur : N vidéos sont produites
// avec un seul crédit.
//
// La route n'est volontairement pas appelée telle quelle : chaque requête qui
// réussirait déclencherait une génération HeyGen réellement facturée, et
// HEYGEN_BASE_URL est codé en dur dans le fichier (route.ts:13), donc non
// redirigeable vers un service local. Le script reproduit donc la séquence
// exacte de la route contre la base, en remplaçant l'appel HeyGen par une
// attente équivalente.
//
// Si une fonction atomique `consume_credit` existe en base (correctif B1.1), le
// script l'utilise à la place : le même test mesure alors le chemin corrigé.
// ============================================

const REQUETES_PARALLELES = 5;
const DUREE_APPEL_HEYGEN_MS = 800;

titre("06 — Course aux crédits : 5 générations simultanées avec 1 seul crédit");

const { user } = await seConnecter(COMPTE_A);
const admin = clientAdmin();

await admin.from("profiles").update({ credits: 1, plan: "starter" }).eq("id", user.id);
await admin.from("video_generations").delete().eq("user_id", user.id);
log(`Compte A (${user.id}) : solde fixé à 1 crédit, historique vidéo vidé`);

// --- Le correctif atomique est-il en place ? ---
const { error: erreurRpc } = await admin.rpc("consume_credit", {
  p_user_id: user.id,
  p_video_id: null,
});
const rpcDisponible = !erreurRpc || !/does not exist|not find/i.test(erreurRpc.message);

if (rpcDisponible) {
  log("Fonction consume_credit détectée : le chemin atomique est testé.");
  await admin.from("profiles").update({ credits: 1 }).eq("id", user.id);
} else {
  log("Aucune fonction consume_credit en base : la séquence actuelle de la route est reproduite.");
}

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reproduit generate-video/route.ts:98-181 pour une requête. */
async function genererUneVideo(numero) {
  if (rpcDisponible) {
    const { error } = await admin.rpc("consume_credit", {
      p_user_id: user.id,
      p_video_id: null,
    });
    if (error) return { numero, aboutie: false, motif: error.message };
    await attendre(DUREE_APPEL_HEYGEN_MS);
    return { numero, aboutie: true };
  }

  // 1. Lecture du solde
  const { data: profil } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  // 2. Contrôle
  if (!profil || profil.credits <= 0) {
    return { numero, aboutie: false, motif: "plus de crédits", soldeLu: profil?.credits };
  }

  // 3. Appel HeyGen (remplacé par une attente de durée équivalente)
  await attendre(DUREE_APPEL_HEYGEN_MS);

  // 4. Écriture du nouveau solde, calculé à partir de la valeur lue en 1.
  await admin
    .from("profiles")
    .update({ credits: profil.credits - 1 })
    .eq("id", user.id);

  await admin.from("video_generations").insert({
    user_id: user.id,
    heygen_video_id: `heygen_course_${numero}`,
    script: "Génération concurrente — preuve d'audit.",
    avatar_id: "avatar_preuve",
    voice_id: "voice_preuve",
    format: "9:16",
    status: "processing",
  });

  return { numero, aboutie: true, soldeLu: profil.credits };
}

log("");
log(`Lancement de ${REQUETES_PARALLELES} requêtes simultanées…`);

const resultats = await Promise.all(
  Array.from({ length: REQUETES_PARALLELES }, (_, i) => genererUneVideo(i + 1))
);

for (const r of resultats) {
  log(
    `  requête ${r.numero} : ${r.aboutie ? "✔ vidéo lancée" : `✖ refusée (${r.motif})`}` +
      (r.soldeLu === undefined ? "" : ` — solde lu : ${r.soldeLu}`)
  );
}

const abouties = resultats.filter((r) => r.aboutie).length;
const { credits: soldeFinal } = (
  await admin.from("profiles").select("credits").eq("id", user.id).single()
).data;

log("");
log(`Vidéos lancées : ${abouties} — attendu avec 1 crédit : 1`);
log(`Solde final : ${soldeFinal} crédits`);

verdict(
  abouties > 1,
  `${abouties} vidéos ont été lancées avec un seul crédit — le solde n'est débité qu'une fois` +
    ` (${soldeFinal} restant), les ${abouties - 1} autres sont offertes`,
  `une seule vidéo a été lancée, les ${REQUETES_PARALLELES - 1} autres requêtes ont été refusées`
);
