import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// ============================================
// Limitation de débit applicative (B2.4)
// ============================================
// Le compteur vit en base (`supabase/migrations/008_limitation_debit.sql`) et
// non en mémoire : l'application tourne en fonctions serverless sur Vercel, où
// chaque instance a sa propre mémoire et se fait recycler. Un compteur local
// serait remis à zéro à chaque démarrage à froid et ignoré par les instances
// voisines — c'est-à-dire inopérant.
//
// Usage dans une route :
//   const limite = await appliquerQuota("generation_video", cleUtilisateur(user.id));
//   if (limite) return limite;
// `appliquerQuota` rend la réponse 429 toute faite, ou `null` si l'appel passe.
// ============================================

// ============================================
// CLÉ DE LIMITATION
// ============================================
// Deux natures de clé, préfixées pour ne jamais se confondre en base.
//
// « user:<uuid> » — clé retenue par défaut. Toutes les routes concernées sont
// authentifiées, et l'identifiant vient de `supabase.auth.getUser()`, donc
// d'une vérification du jeton côté Supabase : il n'est pas falsifiable. Il est
// aussi stable là où l'IP ne l'est pas — un utilisateur derrière un CGNAT ou
// un réseau d'entreprise partage son IP avec des inconnus, et une clé IP le
// ferait bloquer par le voisin. Enfin l'abus que l'on borne (crédits, objets
// Stripe, suppression de compte) est par nature rattaché à un compte.
//
// « ip:<adresse> » — clé de secours, utilisée seulement AVANT
// l'authentification, là où il n'existe pas encore d'identifiant. Elle sert un
// cas que la clé utilisateur ne couvre pas : une rafale de requêtes munies
// d'un jeton invalide. Chacune coûte un aller-retour vers le serveur d'auth
// Supabase et n'est imputable à aucun compte. Elle reste volontairement large
// (voir les quotas) parce qu'elle frappe potentiellement plusieurs personnes à
// la fois.
// ============================================

/** Clé de limitation d'un utilisateur authentifié. */
export function cleUtilisateur(userId: string): string {
  return `user:${userId}`;
}

/**
 * Clé de limitation par adresse IP.
 *
 * `NextRequest.ip` n'existe plus : la propriété a été retirée en Next.js 15
 * (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md,
 * « Version History »), l'adresse étant désormais fournie par l'hébergeur. Le
 * guide de migration renvoie vers `ipAddress()` de `@vercel/functions`, une
 * dépendance qu'on n'ajoute pas pour lire un en-tête : on lit les mêmes
 * en-têtes directement.
 *
 * Ordre de lecture, du plus au moins digne de confiance :
 *   1. `x-vercel-forwarded-for` — posé par le proxy Vercel lui-même ;
 *   2. `x-real-ip` — posé par le proxy également, valeur unique ;
 *   3. `x-forwarded-for` — PREMIÈRE entrée de la liste. La liste se lit du
 *      client vers le proxy : le dernier élément est le maillon le plus
 *      proche du serveur, pas l'appelant. En développement, Next renseigne
 *      lui-même cet en-tête depuis l'adresse de la socket.
 *
 * Ces en-têtes ne sont fiables que parce qu'un proxy de confiance les récrit
 * en entrée. C'est le cas sur Vercel ; un déploiement derrière un autre
 * frontal doit revalider ce point, sans quoi n'importe qui peut annoncer
 * l'adresse de son choix. C'est aussi la raison pour laquelle la clé IP ne
 * garde jamais seule une action authentifiée : au pire un en-tête forgé fait
 * changer de compteur, il n'ouvre aucune porte.
 */
export function cleIp(request: Request): string {
  const entete =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for");

  // Sans en-tête (appel local, test direct), tous les appelants partagent le
  // même compteur : c'est volontaire — mieux vaut un seau commun trop strict
  // qu'une absence de limite.
  const adresse = entete?.split(",")[0]?.trim();
  if (!adresse) return "ip:inconnue";

  // L'en-tête vient du réseau : on borne sa longueur avant de l'écrire en base.
  return `ip:${adresse.slice(0, 64)}`;
}

// ============================================
// QUOTAS
// ============================================
// Chaque quota porte sa limite, sa fenêtre, et son comportement quand la
// vérification elle-même échoue (base injoignable, fonction absente).
//
// Le choix ouvert / fermé se décide route par route, en comparant ce que coûte
// un blocage injustifié à ce que coûte un abus laissé passer :
//
//   ÉCHEC FERMÉ (on refuse) pour les routes à effet de bord externe et
//   irréversible : génération vidéo, suppression de compte, appels Stripe. Une
//   vidéo lancée chez HeyGen, un compte supprimé ou un objet créé chez Stripe
//   ne se reprennent pas. Sur ces routes le refus ne coûte d'ailleurs presque
//   rien : elles interrogent toutes la même base juste après (débit du crédit,
//   lecture du profil) et échoueraient de toute façon. Le vrai cas couvert est
//   celui où seule la limitation est en panne — migration non appliquée,
//   droits mal posés — c'est-à-dire exactement la fenêtre qu'un attaquant
//   chercherait à provoquer.
//
//   ÉCHEC OUVERT (on laisse passer) pour le suivi de génération et
//   l'administration. Ce sont des garde-fous contre l'emballement, pas des
//   contrôles de sécurité : la propriété de la vidéo est vérifiée par
//   ailleurs, et le panneau d'administration exige déjà `profiles.is_admin`.
//   Bloquer ici transformerait une panne du compteur en panne du tableau de
//   bord de tous les utilisateurs, alors que le pire abus toléré est une
//   lecture de statut chez HeyGen.
// ============================================

export type NomQuota =
  | "generation_video"
  | "generation_video_ip"
  | "suppression_compte"
  | "paiement_stripe"
  | "suivi_video"
  | "administration";

type Quota = {
  /** Nombre d'appels autorisés par fenêtre. */
  limite: number;
  /** Durée de la fenêtre, en secondes. Doit rester sous la rétention d'un jour de la purge (migration 008). */
  fenetreSecondes: number;
  /** true = laisser passer si la vérification échoue, false = refuser. */
  echecOuvert: boolean;
};

export const QUOTAS: Record<NomQuota, Quota> = {
  // POST /api/generate-video, par utilisateur.
  // La dépense est déjà bornée par les crédits (un crédit par vidéo, débité
  // atomiquement depuis 004) : ce quota ne protège pas le portefeuille, il
  // borne la RAFALE. Sans lui, un abonné disposant de cent crédits peut
  // déclencher cent tâches HeyGen en une seconde — cent appels externes
  // facturés, autant de chemins de remboursement à dérouler si l'API répond
  // mal. Dix générations par tranche de dix minutes reste très au-dessus de
  // l'usage réel : une vidéo demande plusieurs minutes de rendu, et il faut
  // la regarder avant d'en relancer une.
  generation_video: { limite: 10, fenetreSecondes: 600, echecOuvert: false },

  // POST /api/generate-video, par IP, vérifié AVANT l'authentification.
  // Couvre la rafale de jetons invalides, qu'aucune clé utilisateur ne peut
  // attraper. Volontairement large — plusieurs personnes peuvent partager une
  // IP — mais suffisant pour qu'une boucle ne consomme pas indéfiniment des
  // vérifications de jeton chez Supabase.
  generation_video_ip: { limite: 60, fenetreSecondes: 600, echecOuvert: false },

  // POST /api/account/delete, par utilisateur.
  // Action irréversible et en cascade sur quatre tables. Un utilisateur
  // légitime en fait un usage unique ; la marge de trois sert au cas nominal
  // du refus pour abonnement actif, corrigé puis retenté. Au-delà, il s'agit
  // d'un script qui martèle `auth.admin.deleteUser`.
  suppression_compte: { limite: 3, fenetreSecondes: 3600, echecOuvert: false },

  // POST /api/stripe/checkout et /api/stripe/portal, par utilisateur.
  // Chaque appel crée un objet chez Stripe (client, session de paiement,
  // session de portail) et consomme le quota d'API de notre propre compte
  // Stripe. Quinze appels par tranche de dix minutes laissent largement de
  // quoi hésiter entre les plans, ouvrir puis rouvrir le portail.
  paiement_stripe: { limite: 15, fenetreSecondes: 600, echecOuvert: false },

  // GET /api/video-status et /api/video-download, par utilisateur.
  // Doit rester généreux : le tableau de bord interroge le statut toutes les
  // dix secondes pour CHAQUE vidéo en cours (dashboard/history/page.tsx), soit
  // six appels par minute et par vidéo, multipliés par le nombre d'onglets
  // ouverts. Cinq vidéos sur deux onglets font déjà soixante appels par
  // minute : cent vingt laissent le double de marge tout en coupant la boucle
  // emballée, qui est le seul défaut réellement observé ici.
  suivi_video: { limite: 120, fenetreSecondes: 60, echecOuvert: true },

  // PATCH /api/admin, par administrateur.
  // Le rôle est déjà rare et contrôlé (`profiles.is_admin`, migration 006) et
  // les mutations sont peu coûteuses. Le quota ne vise que le jeton
  // d'administration détourné ou l'interface qui boucle.
  administration: { limite: 60, fenetreSecondes: 60, echecOuvert: true },
};

// ============================================
// VÉRIFICATION
// ============================================

export type ResultatLimitation = {
  autorise: boolean;
  limite: number;
  restant: number;
  /** Secondes avant la réouverture de la fenêtre, calculées par la base. */
  reessayerDans: number;
};

// Client service_role mémorisé : la limitation s'exécute sur le chemin critique
// de chaque requête, inutile de reconstruire le client à chaque appel. Les
// variables d'environnement sont lues à la première utilisation, pas au
// chargement du module, pour ne pas casser la compilation si elles manquent.
let clientAdmin: SupabaseClient<Database> | null = null;

function getClientAdmin(): SupabaseClient<Database> {
  if (!clientAdmin) {
    clientAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return clientAdmin;
}

/**
 * Compte l'appel et dit s'il est autorisé.
 * Ne lève jamais : un échec de vérification est tranché par `echecOuvert`.
 */
export async function verifierQuota(
  quota: NomQuota,
  sujet: string
): Promise<ResultatLimitation> {
  const { limite, fenetreSecondes, echecOuvert } = QUOTAS[quota];

  const surEchec = (raison: unknown): ResultatLimitation => {
    console.error(
      `Vérification de quota indisponible (${quota}, ${sujet}) :`,
      raison,
      echecOuvert ? "— appel laissé passer" : "— appel refusé"
    );
    return {
      autorise: echecOuvert,
      limite,
      restant: 0,
      reessayerDans: fenetreSecondes,
    };
  };

  try {
    const { data, error } = await getClientAdmin().rpc("check_rate_limit", {
      p_bucket: quota,
      p_subject: sujet,
      p_limit: limite,
      p_window_seconds: fenetreSecondes,
    });

    if (error || !data) {
      return surEchec(error);
    }

    return {
      autorise: data.allowed,
      limite: data.limit,
      restant: data.remaining,
      reessayerDans: data.retry_after,
    };
  } catch (erreur) {
    // Le client Supabase peut échouer avant même la requête (réseau, DNS).
    return surEchec(erreur);
  }
}

/**
 * Réponse 429 normalisée.
 * `Retry-After` est exigé par la spécification ; les en-têtes `RateLimit-*`
 * renseignent en plus l'état du seau. Ils ne sont posés que sur le refus :
 * les décorer sur chaque réponse obligerait à réécrire toutes les sorties des
 * routes pour un gain purement informatif.
 */
export function reponseTropDeRequetes(
  resultat: ResultatLimitation
): NextResponse {
  return NextResponse.json(
    {
      error: `Trop de requêtes. Réessayez dans ${resultat.reessayerDans} seconde${
        resultat.reessayerDans > 1 ? "s" : ""
      }.`,
      retry_after: resultat.reessayerDans,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resultat.reessayerDans),
        "RateLimit-Limit": String(resultat.limite),
        "RateLimit-Remaining": String(resultat.restant),
        "RateLimit-Reset": String(resultat.reessayerDans),
      },
    }
  );
}

/**
 * Applique un quota : rend la réponse 429 à retourner tel quel, ou `null` si
 * l'appel peut continuer.
 */
export async function appliquerQuota(
  quota: NomQuota,
  sujet: string
): Promise<NextResponse | null> {
  const resultat = await verifierQuota(quota, sujet);
  return resultat.autorise ? null : reponseTropDeRequetes(resultat);
}
