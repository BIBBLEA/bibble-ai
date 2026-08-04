"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

/**
 * Codes d'erreur produits par la route de callback
 * (src/app/api/auth/callback/route.ts) et traduits pour l'utilisateur.
 */
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code:
    "Ce lien de confirmation est incomplet ou a déjà été utilisé. Demandez un nouvel e-mail ci-dessous.",
  expired_link:
    "Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail de confirmation.",
  pkce_missing:
    "Ce lien doit être ouvert dans le navigateur utilisé lors de l'inscription. Demandez un nouveau lien ci-dessous, puis ouvrez-le depuis cet appareil.",
  verification_failed:
    "La vérification a échoué. Demandez un nouvel e-mail de confirmation.",
  // Rétrocompatibilité : code générique émis par l'ancienne version du callback.
  auth_callback_error:
    "La vérification a échoué. Demandez un nouvel e-mail de confirmation.",
};

const FALLBACK_CALLBACK_ERROR_MESSAGE =
  "La vérification a échoué. Demandez un nouvel e-mail de confirmation.";

/** Messages de succès transmis en query string par le callback. */
const CALLBACK_NOTICE_MESSAGES: Record<string, string> = {
  email_confirmed: "Votre adresse est confirmée. Vous pouvez vous connecter.",
};

const RESEND_COOLDOWN_SECONDS = 60;

const NEUTRAL_RESEND_MESSAGE =
  "Si un compte non confirmé existe pour cette adresse, un nouvel e-mail vient d'être envoyé.";

function isEmailNotConfirmedError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed")
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const callbackErrorCode = searchParams.get("error");
  const callbackNoticeCode = searchParams.get("message");

  const callbackError: string = callbackErrorCode
    ? CALLBACK_ERROR_MESSAGES[callbackErrorCode] ??
      FALLBACK_CALLBACK_ERROR_MESSAGE
    : "";
  const callbackNotice: string = callbackNoticeCode
    ? CALLBACK_NOTICE_MESSAGES[callbackNoticeCode] ?? ""
    : "";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Renvoi de l'e-mail de confirmation (A2)
  const [resendRequested, setResendRequested] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendNotice, setResendNotice] = useState<string>("");
  const [resendError, setResendError] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Le bloc de renvoi est visible d'emblée si le callback a signalé une erreur
  // de confirmation, sinon après une inscription ou un échec « Email not confirmed ».
  const showResendBlock: boolean = resendRequested || Boolean(callbackError);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current: number) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  const buildEmailRedirectTo = (): string =>
    `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
      redirectTo
    )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setResendNotice("");
    setResendError("");

    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Le prénom et le nom sont requis.");
        }

        if (password.length < 8) {
          throw new Error(
            "Le mot de passe doit contenir au moins 8 caractères."
          );
        }

        if (password !== confirmPassword) {
          throw new Error("Les deux mots de passe ne correspondent pas.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildEmailRedirectTo(),
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
          `Votre compte est créé. Un e-mail de confirmation vient d'être envoyé à ${email.trim()} : cliquez sur le lien qu'il contient pour activer votre compte. S'il n'arrive pas dans les prochaines minutes, pensez à vérifier vos spams ou courriers indésirables.`
        );
        setResendRequested(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
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

      if (!isSignUp && isEmailNotConfirmedError(errorMessage)) {
        setError(
          "Votre adresse n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail, ou demandez un nouvel envoi ci-dessous."
        );
        setResendRequested(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendLoading || resendCooldown > 0) return;

    const targetEmail = email.trim();

    setResendNotice("");
    setResendError("");

    if (!targetEmail) {
      setResendError(
        "Saisissez d'abord votre adresse e-mail dans le champ ci-dessus."
      );
      return;
    }

    setResendLoading(true);

    try {
      const { error: resendApiError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: buildEmailRedirectTo(),
        },
      });

      if (resendApiError && resendApiError.status === 429) {
        setResendError(
          "Trop de demandes en peu de temps. Patientez une minute avant de réessayer."
        );
      } else {
        // Réponse neutre : ne pas révéler si un compte existe pour cette adresse.
        setResendNotice(NEUTRAL_RESEND_MESSAGE);
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setResendError(
        "L'envoi n'a pas pu aboutir. Vérifiez votre connexion, puis réessayez."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setMessage("");
    setConfirmPassword("");
    setResendRequested(false);
    setResendNotice("");
    setResendError("");
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

        {/* Retours du lien de confirmation (query string) */}
        {callbackError && (
          <div className="mt-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {callbackError}
          </div>
        )}

        {callbackNotice && (
          <div className="mt-6 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            {callbackNotice}
          </div>
        )}

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
              placeholder="prenom.nom@email.com"
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
              minLength={8}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-muted-foreground">
                8 caractères minimum
              </p>
            )}
            {!isSignUp && (
              <div className="mt-1.5 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium"
              >
                Confirmer le mot de passe *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
          )}

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

        {/* Renvoi de l'e-mail de confirmation */}
        {showResendBlock && (
          <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium">
              Vous n&apos;avez pas reçu l&apos;e-mail de confirmation ?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vérifiez vos spams, puis demandez un nouvel envoi à l&apos;adresse
              saisie ci-dessus.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading
                ? "Envoi en cours..."
                : resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown} s`
                : "Renvoyer l'e-mail de confirmation"}
            </Button>

            {resendError && (
              <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {resendError}
              </div>
            )}

            {resendNotice && (
              <div className="mt-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                {resendNotice}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            onClick={toggleMode}
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
