import Stripe from "stripe";

// ============================================
// Stripe Client & Configuration
// ============================================

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
});

// --- Configuration des plans ---

export interface PlanConfig {
  name: string;
  slug: "starter" | "growth" | "pro";
  monthlyPrice: string;
  annualPrice: string;
  annualMonthlyEquivalent: string;
  credits: number;
  monthlyPriceId: string;
  annualPriceId: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    name: "Starter",
    slug: "starter",
    monthlyPrice: "9,99",
    annualPrice: "107,89",
    annualMonthlyEquivalent: "8,99",
    credits: 2,
    monthlyPriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_STARTER_ANNUAL || "",
    description: "Idéal pour tester",
    features: [
      "2 vidéos courtes / mois",
      "Formats 9:16 et 16:9",
      "Avatars IA réalistes",
      "Export HD",
      "Durée max : 20 secondes",
    ],
  },
  {
    name: "Growth",
    slug: "growth",
    monthlyPrice: "19,99",
    annualPrice: "215,89",
    annualMonthlyEquivalent: "17,99",
    credits: 6,
    monthlyPriceId: process.env.STRIPE_PRICE_GROWTH_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_GROWTH_ANNUAL || "",
    description: "Le plus populaire",
    popular: true,
    features: [
      "6 vidéos courtes / mois",
      "Formats 9:16 et 16:9",
      "Avatars IA réalistes",
      "Export HD",
      "Durée max : 20 secondes",
      "Support prioritaire",
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: "39,99",
    annualPrice: "431,89",
    annualMonthlyEquivalent: "35,99",
    credits: 15,
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
    description: "Pour les pros du marketing",
    features: [
      "15 vidéos courtes / mois",
      "Formats 9:16 et 16:9",
      "Avatars IA réalistes",
      "Export HD",
      "Durée max : 20 secondes",
      "Support prioritaire",
      "Accès anticipé aux nouveautés",
    ],
  },
];

// ============================================
// Table des tarifs : construction sûre
// ============================================
// Écrire `{ [process.env.X || ""]: valeur }` fabrique la clé "" dès qu'une
// variable manque ; plusieurs variables absentes s'écrasent alors sur cette même
// clé et seule la dernière déclarée subsiste. Le mapping perd des entrées sans
// bruit, et un priceId vide devient un plan valide crédité au tarif du dernier
// plan déclaré. On écarte donc les entrées dont le Price ID n'est pas renseigné,
// et on le signale au chargement du module.
//
// Preuve : audit/preuves/scripts/05-mapping-price-ids.mjs

export function construireTableTarifs<T>(
  entrees: Array<{ variable: string; priceId: string | undefined; valeur: T }>,
  libelle = "table des tarifs"
): Record<string, T> {
  const table: Record<string, T> = {};
  const manquantes: string[] = [];

  for (const { variable, priceId, valeur } of entrees) {
    if (!priceId) {
      manquantes.push(variable);
      continue;
    }
    table[priceId] = valeur;
  }

  if (manquantes.length > 0) {
    console.warn(
      `⚠️ ${libelle} — Price IDs Stripe non renseignés (${manquantes.length}/${entrees.length}) : ` +
        `${manquantes.join(", ")} — les abonnements souscrits sur ces tarifs ne seront pas crédités.`
    );
  }

  return table;
}

// Mapping de tous les Price IDs vers les crédits
export const PLAN_CREDITS: Record<string, number> = construireTableTarifs([
  { variable: "STRIPE_PRICE_STARTER_MONTHLY", priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY, valeur: 2 },
  { variable: "STRIPE_PRICE_STARTER_ANNUAL", priceId: process.env.STRIPE_PRICE_STARTER_ANNUAL, valeur: 2 },
  { variable: "STRIPE_PRICE_GROWTH_MONTHLY", priceId: process.env.STRIPE_PRICE_GROWTH_MONTHLY, valeur: 6 },
  { variable: "STRIPE_PRICE_GROWTH_ANNUAL", priceId: process.env.STRIPE_PRICE_GROWTH_ANNUAL, valeur: 6 },
  { variable: "STRIPE_PRICE_PRO_MONTHLY", priceId: process.env.STRIPE_PRICE_PRO_MONTHLY, valeur: 15 },
  { variable: "STRIPE_PRICE_PRO_ANNUAL", priceId: process.env.STRIPE_PRICE_PRO_ANNUAL, valeur: 15 },
], "PLAN_CREDITS");

// --- Helpers ---

export function getPlanBySlug(slug: string): PlanConfig | undefined {
  return PLANS.find((p) => p.slug === slug);
}

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  // Même piège que pour la table des tarifs : un Price ID vide correspondrait à
  // tous les plans dont la variable d'environnement n'est pas renseignée.
  if (!priceId) return undefined;
  return PLANS.find(
    (p) => p.monthlyPriceId === priceId || p.annualPriceId === priceId
  );
}

export function getCreditsForPlan(slug: string): number {
  const plan = getPlanBySlug(slug);
  return plan?.credits || 0;
}
