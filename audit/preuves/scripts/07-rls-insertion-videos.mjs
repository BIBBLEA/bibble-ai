import {
  COMPTE_A,
  VIDEO_DE_B,
  clientAnon,
  exigerAppEnLigne,
  log,
  seConnecter,
  titre,
  verdict,
} from "./_lib.mjs";

// ============================================
// PREUVE 07 — Contournement du contrôle de propriété (B2.5)
// ============================================
// Démontrer le correctif : retirer la policy INSERT de video_generations.
//
// Cible : 001_initial_schema.sql:195-197 — policy « Users can insert own videos »,
//         WITH CHECK (auth.uid() = user_id). L'utilisateur choisit librement le
//         heygen_video_id de la ligne qu'il insère.
// Méthode : le contrôle ajouté en B2.1 cherche dans video_generations une ligne
//         portant le heygen_video_id demandé ET le user_id de l'appelant. Il
//         suffit donc de créer cette ligne soi-même pour le satisfaire.
//         Aucun code n'utilise cette policy : la seule insertion applicative se
//         fait côté serveur avec la clé service_role (generate-video).
//
// Avant : insertion acceptée, la vidéo d'autrui redevient accessible — code 1
// Après : insertion refusée, le refus 403 tient — code 0
// ============================================

titre("07 — Contournement du contrôle de propriété par insertion directe");

const base = await exigerAppEnLigne();
const { user, jeton } = await seConnecter(COMPTE_A);
log(`Compte A : ${user.id}`);

// --- 1. Le contrôle de propriété refuse bien la vidéo de B ---
const avant = await fetch(`${base}/api/video-download?video_id=${VIDEO_DE_B}`, {
  headers: { Authorization: `Bearer ${jeton}` },
});
log(`Demande sur la vidéo de B → HTTP ${avant.status}`);

// --- 2. A s'auto-déclare propriétaire du même identifiant, avec la clé anon ---
log("");
log("Insertion tentée avec la clé publique du site :");
log(`  supabase.from("video_generations").insert({ user_id: "<A>", heygen_video_id: "${VIDEO_DE_B}" })`);

const supabase = clientAnon(jeton);
const { error } = await supabase.from("video_generations").insert({
  user_id: user.id,
  heygen_video_id: VIDEO_DE_B,
  script: "Ligne insérée par l'utilisateur lui-même.",
  avatar_id: "avatar_preuve",
  voice_id: "voice_preuve",
  format: "9:16",
  status: "completed",
});

log(
  error
    ? `Réponse : refus de PostgREST — ${error.code} ${error.message}`
    : "Réponse : insertion acceptée — A figure désormais comme propriétaire de la vidéo de B"
);

// --- 3. Nouvelle demande sur la même vidéo ---
const apres = await fetch(`${base}/api/video-download?video_id=${VIDEO_DE_B}`, {
  headers: { Authorization: `Bearer ${jeton}` },
});
log(`Nouvelle demande sur la vidéo de B → HTTP ${apres.status}`);

verdict(
  !error && apres.status !== 403,
  "une simple insertion suffit à se déclarer propriétaire de la vidéo d'un autre :" +
    " le contrôle ajouté en B2.1 est neutralisé",
  "l'insertion est refusée, le contrôle de propriété tient"
);
