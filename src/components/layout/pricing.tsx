"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "📦 Starter",
    monthlyPrice: "9,99",
    annualMonthlyPrice: "8,99",
    annualTotalPrice: "107,89",
    description: "Idéal pour tester vos deux premiers hooks publicitaires.",
    popular: false,
    features: [
      "2 crédits de vidéos par mois",
      "Formats TikTok, Reels & YouTube (9:16 et 16:9)",
      "Export Haute Définition 1080p (Durée max : 20s)",
    ],
  },
  {
    name: "🚀 Growth",
    monthlyPrice: "19,99",
    annualMonthlyPrice: "17,99",
    annualTotalPrice: "215,89",
    description:
      "Parfait pour lancer vos premiers A/B tests et trouver vos visuels gagnants.",
    popular: true,
    features: [
      "6 crédits de vidéos par mois (Volume triplé pour vos offres)",
      "Permet de tester 3x plus de variantes et d'hooks chaque semaine",
      "Génération en priorité normale (Vos vidéos passent avant les Starter)",
      "Idéal pour les e-commerçants (Mono-produit / Dropshipping)",
      "Formats TikTok, Reels & YouTube (9:16 et 16:9)",
      "Export Haute Définition 1080p",
    ],
  },
  {
    name: "👑 Pro",
    monthlyPrice: "39,99",
    annualMonthlyPrice: "35,99",
    annualTotalPrice: "431,89",
    description:
      "Conçu pour les marques et agences qui scalent leurs campagnes en continu.",
    popular: false,
    features: [
      "15 crédits de vidéos par mois (Le plein d'Ads pour vos tunnels)",
      "Idéal pour renouveler vos créatives et éviter la fatigue publicitaire",
      "Accès complet à tous les avatars & voix IA",
      "Formats TikTok, Reels & YouTube (9:16 et 16:9)",
      "Export Haute Définition 1080p",
    ],
  },
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Choisissez votre rythme de production
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            1 crédit = 1 vidéo publicitaire haute conversion. Choisissez le forfait adapté à votre rythme de production.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <span
            className={`text-sm font-medium transition-colors ${
              !isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Mensuel
          </span>

          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isAnnual ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            aria-label="Basculer entre facturation mensuelle et annuelle"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                isAnnual ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium transition-colors ${
                isAnnual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Annuel
            </span>
            <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-400 ring-1 ring-green-500/30">
              -10%
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "scale-[1.02] border-primary bg-card shadow-lg shadow-primary/10"
                  : "border-[rgba(255,255,255,0.25)] bg-card/50 hover:border-[rgba(255,255,255,0.4)] hover:bg-card/70 hover:shadow-xl hover:shadow-white/5"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                    Le plus populaire
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {isAnnual ? plan.annualMonthlyPrice : plan.monthlyPrice}€
                  </span>
                  <span className="text-muted-foreground">/ mois</span>
                </div>
                {isAnnual && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Facturé {plan.annualTotalPrice}€/an
                  </p>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 text-primary">✓</span>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/login" className="mt-auto block">
                <button
                  className={`w-full rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                    plan.popular
                      ? "bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40"
                      : "border border-[rgba(255,255,255,0.4)] text-white hover:border-[rgba(255,255,255,0.6)] hover:bg-white/10"
                  }`}
                >
                  Lancer ma première vidéo →
                </button>
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Paiement sécurisé via Stripe • Sans engagement
        </p>
      </div>
    </section>
  );
}
