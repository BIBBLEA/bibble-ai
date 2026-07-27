import Stripe from "stripe";

// ============================================
// Stripe Client & Configuration
// ============================================

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
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

// Mapping de tous les Price IDs vers les crédits
export const PLAN_CREDITS: Record<string, number> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY || ""]: 2,
  [process.env.STRIPE_PRICE_STARTER_ANNUAL || ""]: 2,
  [process.env.STRIPE_PRICE_GROWTH_MONTHLY || ""]: 6,
  [process.env.STRIPE_PRICE_GROWTH_ANNUAL || ""]: 6,
  [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: 15,
  [process.env.STRIPE_PRICE_PRO_ANNUAL || ""]: 15,
};

// --- Helpers ---

export function getPlanBySlug(slug: string): PlanConfig | undefined {
  return PLANS.find((p) => p.slug === slug);
}

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return PLANS.find(
    (p) => p.monthlyPriceId === priceId || p.annualPriceId === priceId
  );
}

export function getCreditsForPlan(slug: string): number {
  const plan = getPlanBySlug(slug);
  return plan?.credits || 0;
}
