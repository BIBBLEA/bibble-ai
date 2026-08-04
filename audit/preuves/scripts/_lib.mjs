import { createClient } from "@supabase/supabase-js";

// ============================================
// Helpers communs aux scripts de preuve
// ============================================
// Codes de sortie :
//   0 → ✅ BLOQUÉ       : la faille n'est pas exploitable (état attendu APRÈS correctif)
//   1 → ❌ EXPLOITÉ     : la faille est exploitable (état attendu AVANT correctif)
//   2 → ⚠️ INDÉTERMINÉ : un prérequis manque, rien n'a pu être conclu
// ============================================

export const EXIT_BLOQUE = 0;
export const EXIT_EXPLOITE = 1;
export const EXIT_INDETERMINE = 2;

export const COMPTE_A = {
  email: "preuve-a@bibble-preuves.test",
  password: "MotDePassePreuveA!2026",
  libelle: "compte A (attaquant)",
};

export const COMPTE_B = {
  email: "preuve-b@bibble-preuves.test",
  password: "MotDePassePreuveB!2026",
  libelle: "compte B (victime)",
};

// Vidéo fictive appartenant à B, utilisée pour la preuve d'IDOR
export const VIDEO_DE_B = "heygen_video_appartenant_a_B";
export const VIDEO_DE_A = "heygen_video_appartenant_a_A";

export function horodatage() {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export function log(message) {
  console.log(`[${horodatage()}] ${message}`);
}

export function titre(texte) {
  console.log("");
  console.log("=".repeat(78));
  console.log(texte);
  console.log("=".repeat(78));
}

/**
 * Imprime le verdict et termine le processus avec le code correspondant.
 * `exploite` : true si la faille a pu être exploitée.
 */
export function verdict(exploite, messageExploite, messageBloque) {
  console.log("");
  if (exploite) {
    console.log(`❌ EXPLOITÉ — ${messageExploite}`);
    process.exit(EXIT_EXPLOITE);
  }
  console.log(`✅ BLOQUÉ — ${messageBloque}`);
  process.exit(EXIT_BLOQUE);
}

export function indetermine(raison) {
  console.log("");
  console.log(`⚠️  INDÉTERMINÉ — ${raison}`);
  process.exit(EXIT_INDETERMINE);
}

export function variable(nom, defaut) {
  const valeur = process.env[nom] ?? defaut;
  if (valeur === undefined) {
    indetermine(`variable d'environnement ${nom} absente`);
  }
  return valeur;
}

/**
 * Garde-fou : ces scripts exploitent réellement les failles (écritures en base,
 * soldes modifiés). Ils refusent de viser autre chose qu'une instance locale.
 */
export function exigerCibleLocale(url) {
  const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(url);
  if (local) return;
  if (process.env.PREUVES_ALLOW_REMOTE === "1") {
    log(`⚠️  Cible NON locale acceptée via PREUVES_ALLOW_REMOTE=1 : ${url}`);
    return;
  }
  console.error("");
  console.error(`⛔ Cible refusée : ${url}`);
  console.error(
    "   Ces scripts modifient des soldes et exploitent des failles : ils ne doivent",
    "\n   viser qu'une instance locale. Pour forcer, PREUVES_ALLOW_REMOTE=1."
  );
  process.exit(EXIT_INDETERMINE);
}

export function urlSupabase() {
  const url = variable("SUPABASE_URL", "http://127.0.0.1:54321");
  exigerCibleLocale(url);
  return url;
}

export function urlApp() {
  const url = variable("APP_URL", "http://localhost:3000");
  exigerCibleLocale(url);
  return url;
}

export function clientAdmin() {
  return createClient(urlSupabase(), variable("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function clientAnon(jetonAcces) {
  return createClient(urlSupabase(), variable("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jetonAcces
      ? { headers: { Authorization: `Bearer ${jetonAcces}` } }
      : undefined,
  });
}

/** Ouvre une session pour un compte de test et renvoie { user, jeton }. */
export async function seConnecter(compte) {
  const supabase = clientAnon();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: compte.email,
    password: compte.password,
  });
  if (error || !data.session) {
    indetermine(
      `connexion impossible pour ${compte.email} (${error?.message ?? "pas de session"})` +
        " — lancer d'abord 00-setup.mjs"
    );
  }
  return { user: data.user, jeton: data.session.access_token };
}

/** Vérifie que l'application Next tourne ; sinon verdict INDÉTERMINÉ. */
export async function exigerAppEnLigne() {
  const base = urlApp();
  try {
    await fetch(base, { method: "GET", signal: AbortSignal.timeout(5000) });
  } catch {
    indetermine(
      `application injoignable sur ${base} — la démarrer avec « npm run dev »`
    );
  }
  return base;
}

export async function soldeDe(userId) {
  const { data, error } = await clientAdmin()
    .from("profiles")
    .select("credits, plan")
    .eq("id", userId)
    .single();
  if (error) indetermine(`lecture du profil impossible : ${error.message}`);
  return data;
}
