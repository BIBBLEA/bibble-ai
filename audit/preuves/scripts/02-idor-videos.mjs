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
// PREUVE 02 — IDOR sur /api/video-download et /api/video-status
// ============================================
// Faille visée : audit/plan-implementation.md § B2.1 et B2.2
// Origine      : src/app/api/video-download/route.ts:53-102
//                src/app/api/video-status/route.ts:85-121
//
// Les deux routes authentifient bien l'appelant, puis appellent HeyGen avec le
// `video_id` reçu et renvoient le résultat. Le seul endroit où `user.id` est
// utilisé est le `.eq("user_id", user.id)` de la mise à jour en base
// (video-download/route.ts:96) — la *réponse*, elle, n'est jamais filtrée.
// Aucune requête ne vérifie que la vidéo demandée appartient à l'appelant.
//
// Méthode : test différentiel. Le compte A demande sa propre vidéo, puis celle
// de B. Si les deux appels reçoivent la même réponse, la route ne distingue pas
// le propriétaire d'un tiers : le contrôle d'accès est absent.
//
// Note : en local, sans clé HeyGen valide, l'appel amont échoue et les deux
// réponses sont des erreurs HeyGen (502). C'est précisément ce qui prouve
// l'absence de contrôle : une route correcte aurait répondu 403 sur la vidéo de
// B *avant* de contacter HeyGen. Après correctif, les deux réponses diffèrent.
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
