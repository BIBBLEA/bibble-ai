"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 60;

const NEUTRAL_MESSAGE =
  "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.";

const RATE_LIMIT_MESSAGE =
  "Trop de demandes. Réessayez dans quelques minutes.";

function isRateLimitError(error: {
  message?: string;
  status?: number;
}): boolean {
  if (error.status === 429) return true;
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("for security purposes")
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  // Compte à rebours anti-abus (l'intervalle minimum côté Supabase est de 60 s).
  // L'intervalle est nettoyé au démontage comme à chaque fin de décompte.
  useEffect(() => {
    if (cooldownUntil === null) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000)
      );
      setCooldown(remaining);
      if (remaining === 0) setCooldownUntil(null);
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [cooldownUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;

    setLoading(true);
    setMessage("");
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
          "/auth/update-password"
        )}`,
      }
    );

    // Réponse neutre systématique : on ne révèle jamais si le compte existe.
    // Seules les erreurs de limite de fréquence sont signalées telles quelles.
    if (resetError && isRateLimitError(resetError)) {
      setError(RATE_LIMIT_MESSAGE);
    } else {
      setMessage(NEUTRAL_MESSAGE);
      setCooldown(COOLDOWN_SECONDS);
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    }

    setLoading(false);
  };

  const buttonLabel = loading
    ? "Envoi en cours..."
    : cooldown > 0
    ? `Renvoyer dans ${cooldown} s`
    : message
    ? "Renvoyer l'e-mail"
    : "Envoyer le lien de réinitialisation";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-0 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <img src="/logo.png" alt="Bibble AI Logo" className="h-64 w-auto" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Indiquez l&apos;adresse e-mail de votre compte : nous vous enverrons
            un lien pour définir un nouveau mot de passe.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="prenom.nom@email.com"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || cooldown > 0}
            >
              {buttonLabel}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Vous vous souvenez de votre mot de passe ?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
