import {
  COMPTE_A,
  VIDEO_DE_A,
  VIDEO_DE_B,
  exigerAppEnLigne,
  log,
  seConnecter,
  titre,
  verdict,
} from "./_lib.mjs";

// ============================================
// PREUVE 02 — Accès aux vidéos d'autrui (B2.1 / B2.2)
// ============================================
// Démontrer le correctif : vérifier la propriété de la vidéo avant tout traitement.
//
// Cible : src/app/api/video-download/route.ts:53-102
//         src/app/api/video-status/route.ts:85-121
//         Le `.eq("user_id", user.id)` ne filtre que la mise à jour en base, jamais la réponse.
// Méthode : test différentiel — demander sa propre vidéo, puis celle d'un autre compte.
//           Réponses identiques = aucun contrôle de propriété.
//
// Note : sans clé HeyGen valide, les deux appels échouent en 502. C'est ce qui prouve l'absence
//        de contrôle : un refus 403 devrait intervenir avant l'appel HeyGen.
//
// Avant : réponses identiques sur sa vidéo et celle d'autrui — code 1
// Après : 403 sur la vidéo d'autrui — code 0
// ============================================

titre("02 — IDOR : accès aux vidéos d'un autre utilisateur");

const base = await exigerAppEnLigne();
const { user, jeton } = await seConnecter(COMPTE_A);
log(`Connecté en tant que ${COMPTE_A.email} (${user.id})`);
log(`Application testée : ${base}`);

async function appeler(chemin, videoId) {
  const reponse = await fetch(`${base}${chemin}?video_id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  let corps;
  try {
    corps = await reponse.json();
  } catch {
    corps = null;
  }
  return { statut: reponse.status, corps };
}

const resultats = [];

for (const chemin of ["/api/video-download", "/api/video-status"]) {
  log("");
  log(`--- ${chemin} ---`);

  const sienne = await appeler(chemin, VIDEO_DE_A);
  log(`  vidéo de A (légitime)   → HTTP ${sienne.statut} ${JSON.stringify(sienne.corps)}`);

  const autrui = await appeler(chemin, VIDEO_DE_B);
  log(`  vidéo de B (illégitime) → HTTP ${autrui.statut} ${JSON.stringify(autrui.corps)}`);

  const refuse = autrui.statut === 403;
  const identiques = sienne.statut === autrui.statut;

  if (refuse) {
    log("  ⇒ la demande sur la vidéo d'autrui est refusée (403)");
  } else if (identiques) {
    log("  ⇒ réponses identiques : la route ne distingue pas le propriétaire d'un tiers");
  } else {
    log("  ⇒ réponses différentes sans refus explicite — à examiner manuellement");
  }

  resultats.push({ chemin, refuse, identiques, statutAutrui: autrui.statut });
}

const routesVulnerables = resultats.filter((r) => !r.refuse);

verdict(
  routesVulnerables.length > 0,
  `${routesVulnerables.length} route(s) sur ${resultats.length} traitent la vidéo d'un autre ` +
    `utilisateur sans contrôle de propriété : ${routesVulnerables
      .map((r) => `${r.chemin} (HTTP ${r.statutAutrui})`)
      .join(", ")}`,
  "les deux routes refusent (403) l'accès à la vidéo d'un autre utilisateur"
);
