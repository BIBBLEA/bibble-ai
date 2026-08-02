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
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-secondary pr-10 pl-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1500" fill="currentColor" className="h-5 w-5"><path d="M 924.71875 862.679688 L 896.519531 841.078125 C 896.519531 841.078125 896.398438 841.199219 896.398438 841.199219 L 888 834.839844 C 888 834.71875 888.121094 834.71875 888.121094 834.71875 L 861.839844 814.679688 C 861.839844 814.800781 861.71875 814.800781 861.71875 814.800781 L 827.761719 788.878906 C 827.761719 788.761719 827.761719 788.761719 827.878906 788.761719 L 692.28125 685.078125 C 692.28125 685.078125 692.160156 685.199219 692.160156 685.199219 L 658.199219 659.28125 C 658.199219 659.28125 658.320312 659.160156 658.320312 659.160156 L 637.078125 642.960938 L 632.160156 639.121094 L 607.320312 620.160156 C 607.199219 620.160156 607.199219 620.160156 607.078125 620.28125 L 543.839844 571.679688 L 523.800781 597.71875 L 575.398438 637.199219 C 553.441406 650.761719 533.039062 666.839844 514.558594 685.441406 L 450 750 L 514.558594 814.558594 C 546.359375 846.359375 583.441406 870.960938 624.71875 887.761719 C 664.679688 903.960938 706.800781 912.121094 750 912.121094 C 793.199219 912.121094 835.441406 903.960938 875.28125 887.761719 C 881.28125 885.359375 887.160156 882.71875 892.921875 879.960938 L 956.28125 928.320312 L 976.199219 902.28125 L 924.601562 862.800781 C 924.601562 862.679688 924.601562 862.679688 924.71875 862.679688 Z M 672.238281 711.238281 C 666.359375 722.878906 663.121094 736.078125 663.121094 750 C 663.121094 798 702 836.878906 750 836.878906 C 772.199219 836.878906 792.480469 828.601562 807.839844 814.800781 L 841.800781 840.71875 C 819.601562 863.160156 789.121094 877.558594 755.398438 879 C 751.921875 879.121094 748.320312 879.121094 744.71875 879 C 675.960938 876.238281 620.878906 819.359375 620.878906 750 C 620.878906 726.480469 627.238281 704.28125 638.28125 685.320312 Z M 537.71875 791.28125 L 496.441406 750 L 537.71875 708.71875 C 557.761719 688.679688 580.078125 672 603.71875 658.800781 L 612.121094 665.160156 C 596.878906 689.878906 588.121094 718.921875 588.121094 750 C 588.121094 788.398438 601.558594 823.679688 623.878906 851.398438 C 592.558594 837 563.398438 816.960938 537.71875 791.28125 Z M 537.71875 791.28125 "/><path d="M 985.441406 685.441406 C 953.640625 653.640625 916.558594 629.039062 875.28125 612.238281 C 835.441406 596.160156 793.199219 587.878906 750 587.878906 C 713.160156 587.878906 677.160156 593.878906 642.601562 605.640625 L 657.601562 617.039062 L 675 630.359375 L 685.320312 638.28125 C 702.960938 628.078125 723.121094 621.839844 744.71875 621 C 748.199219 620.878906 751.800781 620.878906 755.398438 621 C 824.160156 623.761719 879.238281 680.640625 879.238281 750 C 879.238281 761.519531 877.679688 772.558594 874.921875 783.121094 L 902.640625 804.359375 C 908.761719 787.320312 912 769.078125 912 750 C 912 711.601562 898.558594 676.320312 876.238281 648.601562 C 907.441406 663 936.601562 683.039062 962.28125 708.71875 L 1003.558594 750 L 962.28125 791.28125 C 950.878906 802.679688 938.640625 813 925.921875 822.238281 L 953.039062 843 C 964.320312 834.238281 975.121094 824.761719 985.441406 814.441406 L 1050 749.878906 Z M 985.441406 685.441406 "/><path d="M 836.878906 750 C 836.878906 702 798 663.121094 750 663.121094 C 740.640625 663.121094 731.640625 664.558594 723.238281 667.320312 L 836.878906 754.199219 C 836.878906 752.761719 836.878906 751.320312 836.878906 750 Z M 836.878906 750 "/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" stroke="currentColor" className="h-5 w-5"><path d="M288 144a110.5 110.5 0 0 0-3.6 21.7c-2.4 12.1-3.6 24.4-3.6 36.3c0 79.5 64.5 144 144 144c11.9 0 24.2-1.2 36.3-3.6c12.1-2.4 23.9-5.6 35.1-9.6L480 408c-32.6 36.8-71.6 59.2-110.3 71.1c-7.9 3.3-16.7 3.3-24.6 0c-35.7-14.9-87.7-46.2-131.1-93c-43.7-47.1-80.6-111.8-80.6-192.6c0-37.3 7.9-71.2 20.6-101.5L41 39.1C31.7 29.7 31.7 14.5 41 5.1S63.7 5.1 73.1 14.5L567.2 508.6c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L288 144zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7c79.5 0 144 64.5 144 144c0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7c-13.7-51.2-66.4-81.6-117.6-67.9c-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9c-79.5 0-144-64.5-144-144c0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1c47.1 43.7 111.8 80.6 192.6 80.6c37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/></svg>
                )}
              </button>
            </div>
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
