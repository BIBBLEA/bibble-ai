"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

const MIN_PASSWORD_LENGTH = 8;
const REDIRECT_DELAY_MS = 1500;

type SessionStatus = "checking" | "ready" | "invalid";

function translateUpdateError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("should be different")) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  if (normalized.includes("at least")) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (
    normalized.includes("weak") ||
    normalized.includes("password should contain")
  ) {
    return "Ce mot de passe est trop faible. Choisissez une combinaison plus complexe.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Trop de demandes. Réessayez dans quelques minutes.";
  }
  return "La mise à jour du mot de passe a échoué. Réessayez ou demandez un nouveau lien.";
}

function isSessionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("session") ||
    normalized.includes("jwt") ||
    normalized.includes("token")
  );
}

function InvalidLinkCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <h1 className="text-2xl font-bold">Lien invalide</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ce lien de réinitialisation a expiré ou a déjà été utilisé.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Les liens de réinitialisation ne sont valables qu&apos;une seule fois et
        pour une durée limitée. Demandez-en un nouveau pour continuer.
      </p>

      <Link href="/auth/forgot-password" className="mt-6 block">
        <Button className="w-full" size="lg">
          Demander un nouveau lien
        </Button>
      </Link>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  // Un `?error=` produit par le callback (expired_link, missing_code,
  // pkce_missing, verification_failed…) invalide le lien d'entrée de jeu.
  const [status, setStatus] = useState<SessionStatus>(
    errorParam ? "invalid" : "checking"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Le lien e-mail passe par /api/auth/callback : la session de récupération
  // est déjà posée en cookie. On la vérifie avant d'afficher le formulaire.
  useEffect(() => {
    if (errorParam) return;

    let cancelled = false;

    const checkSession = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      setStatus(userError || !data.user ? "invalid" : "ready");
    };

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [errorParam]);

  // Redirection différée après succès (timer nettoyé au démontage)
  useEffect(() => {
    if (!success) return;

    const timeoutId = setTimeout(() => {
      window.location.href = "/dashboard";
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      if (isSessionError(updateError.message)) {
        setStatus("invalid");
      } else {
        setError(translateUpdateError(updateError.message));
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (status === "checking") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Vérification du lien de réinitialisation...
        </p>
      </div>
    );
  }

  if (status === "invalid") {
    return <InvalidLinkCard />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisissez un nouveau mot de passe pour votre compte Bibble AI.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            disabled={success}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-muted-foreground/60">
            8 caractères minimum
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium"
          >
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            disabled={success}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            Mot de passe mis à jour. Redirection vers votre tableau de bord...
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading || success}
        >
          {success
            ? "Redirection..."
            : loading
            ? "Mise à jour..."
            : "Mettre à jour le mot de passe"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
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

        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          }
        >
          <UpdatePasswordForm />
        </Suspense>

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
