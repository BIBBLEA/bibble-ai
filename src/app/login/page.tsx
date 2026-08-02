"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Le prénom et le nom sont requis.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            data: {
              full_name: `${firstName.trim()} ${lastName.trim()}`,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim() || null,
            },
          },
        });
        if (error) throw error;
        setMessage(
          "Vérifiez votre email pour confirmer votre inscription."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = redirectTo;
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.toLowerCase().trim(), {
        redirectTo: "https://www.bibble-ai.com/reset-password",
      });
      if (error) throw error;
      setMessage("Un lien de réinitialisation a été envoyé à votre adresse e-mail.");
      setIsForgotPassword(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-0 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <img src="/logo.png" alt="Bibble AI Logo" className="h-64 w-auto" />
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold">
          {isSignUp ? "Créer un compte" : "Connexion"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp
            ? "Commencez à créer des vidéos publicitaires IA"
            : "Accédez à votre espace de génération vidéo"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignUp && (
            <>
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Prénom *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Nom *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email {isSignUp && "*"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              Mot de passe {isSignUp && "*"}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
            <Link
              href="#"
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-primary hover:underline block text-right mt-1"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium"
              >
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="+33 6 12 34 56 78"
              />
              <p className="mt-1 text-xs text-muted-foreground/60 italic">
                (Optionnel — uniquement pour le support d&apos;urgence)
              </p>
            </div>
          )}

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
            disabled={loading}
          >
            {loading
              ? "Chargement..."
              : isSignUp
              ? "Créer mon compte"
              : "Se connecter"}
          </Button>
        </form>

        {isForgotPassword && (
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="forgotPasswordEmail"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
              </label>
              <input
                id="forgotPasswordEmail"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="vous@exemple.com"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Chargement..." : "Envoyer le lien de réinitialisation"}
            </Button>
            <button
              onClick={() => setIsForgotPassword(false)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              Annuler
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Se connecter" : "S'inscrire"}
          </button>
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
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <Suspense
        fallback={
          <div className="text-center text-muted-foreground">
            Chargement...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

// Modification mineure pour forcer un nouveau déploiement
