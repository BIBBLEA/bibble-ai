"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    slug: "starter",
    monthlyPrice: "9,99",
    annualMonthlyPrice: "8,99",
    annualTotalPrice: "107,89",
    savings: "11,99",
    credits: 2,
    description: "Idéal pour tester",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || "price_starter_annual",
  },
  {
    name: "Growth",
    slug: "growth",
    monthlyPrice: "19,99",
    annualMonthlyPrice: "17,99",
    annualTotalPrice: "215,89",
    savings: "23,99",
    credits: 6,
    description: "Le plus populaire",
    popular: true,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY || "price_growth_monthly",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL || "price_growth_annual",
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: "39,99",
    annualMonthlyPrice: "35,99",
    annualTotalPrice: "431,89",
    savings: "47,99",
    credits: 15,
    description: "Pour les pros",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || "price_pro_annual",
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadUserData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setCredits(profile.credits);
      setPlan(profile.plan);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Créer une checkout session Stripe
  const handleCheckout = async (planSlug: string) => {
    setCheckoutLoading(planSlug);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const selectedPlan = plans.find((p) => p.slug === planSlug);
      if (!selectedPlan) return;

      const priceId = isAnnual
        ? selectedPlan.annualPriceId
        : selectedPlan.monthlyPriceId;

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création de la session.");
      }

      // Rediriger vers Stripe Checkout
      if (result.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      } else {
        throw new Error("URL de redirection manquante.");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Une erreur est survenue lors de la redirection vers le paiement. Veuillez réessayer.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Ouvrir le portail client Stripe
  const handleManageSubscription = async () => {
    setPortalLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur");
      }

      if (result.data?.portal_url) {
        window.location.href = result.data.portal_url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader credits={credits} plan={plan} />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Mon abonnement</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez votre forfait et vos crédits
            </p>
          </div>

          {/* Current Plan Summary */}
          {plan && (
            <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plan actuel</p>
                  <p className="mt-1 text-xl font-bold capitalize">{plan}</p>
                  <p className="text-sm text-muted-foreground">
                    {credits} crédit{credits !== 1 ? "s" : ""} restant
                    {credits !== 1 ? "s" : ""} ce mois-ci
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {plans.find((p) => p.slug === plan)?.monthlyPrice || "—"}€
                  </p>
                  <p className="text-sm text-muted-foreground">/ mois</p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading
                    ? "Chargement..."
                    : "Gérer mon abonnement (factures, carte, annulation)"}
                </Button>
              </div>
            </div>
          )}

          {/* No plan */}
          {!plan && (
            <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-yellow-500">
                    Aucun abonnement actif
                  </p>
                  <p className="text-sm text-yellow-500/80">
                    Choisissez un forfait ci-dessous pour commencer à générer
                    des vidéos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Mensuel / Annuel */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {plan ? "Changer de forfait" : "Choisir un forfait"}
            </h3>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Mensuel
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  isAnnual ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                aria-label="Basculer entre facturation mensuelle et annuelle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    isAnnual ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium transition-colors ${
                  isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Annuel
              </span>
              {isAnnual && (
                <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-green-400 ring-1 ring-green-500/30">
                  -10%
                </span>
              )}
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = plan === p.slug;
              return (
                <div
                  key={p.name}
                  className={`relative rounded-xl border p-5 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : p.popular
                      ? "border-primary/50 bg-card"
                      : "border-border bg-card"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      Populaire
                    </span>
                  )}
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-3">
                    <p className="text-2xl font-bold">
                      {isAnnual ? p.annualMonthlyPrice : p.monthlyPrice}€
                      <span className="text-sm font-normal text-muted-foreground">
                        /mois
                      </span>
                    </p>
                    {isAnnual && (
                      <div className="mt-0.5">
                        <p className="text-[11px] text-muted-foreground">
                          Facturé {p.annualTotalPrice}€/an
                        </p>
                        <p className="text-[11px] font-medium text-green-400">
                          Économisez {p.savings}€/an
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.credits} vidéo{p.credits > 1 ? "s" : ""} / mois
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant={isCurrent ? "secondary" : p.popular ? "default" : "outline"}
                    size="sm"
                    disabled={isCurrent || checkoutLoading === p.slug}
                    onClick={() => handleCheckout(p.slug)}
                  >
                    {checkoutLoading === p.slug
                      ? "Redirection..."
                      : isCurrent
                      ? "Plan actuel"
                      : "Passer à ce plan"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Tous les prix sont en euros (€) TTC. Annulation possible à tout
            moment via le portail Stripe. Les crédits non utilisés ne sont pas
            reportés au mois suivant.
          </p>
        </div>
      </div>
    </div>
  );
}
