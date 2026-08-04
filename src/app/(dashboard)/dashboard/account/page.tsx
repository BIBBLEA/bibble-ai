"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ============================================
// /dashboard/account — Mon compte
// ============================================
// Page cliente, comme /dashboard/billing et /dashboard/history :
// toutes les opérations (profil, mot de passe, e-mail) passent par le
// client Supabase navigateur, qui détient la session de l'utilisateur.
// La protection d'accès est assurée en amont par le middleware
// (`src/lib/supabase-middleware.ts` redirige /dashboard/* vers /login).
// ============================================

const inputClass =
  "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

interface AccountData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  credits: number;
  plan: string | null;
}

// Les métadonnées utilisateur ne sont pas typées : on lit prudemment.
function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
      {children}
    </div>
  );
}

function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
      {children}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={danger ? "border-red-500/30 bg-red-500/5 p-6" : "p-6"}>
      <h3 className={`text-lg font-semibold ${danger ? "text-red-400" : ""}`}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </Card>
  );
}

// ============================================
// A4.2 — Profil (prénom, nom, téléphone)
// ============================================
// La table `profiles` ne possède que `full_name` : le prénom, le nom et le
// téléphone vivent dans les métadonnées utilisateur (écrites à l'inscription).
// On met donc à jour les deux sources pour qu'elles ne divergent pas.
function ProfileSection({ account }: { account: AccountData }) {
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [phone, setPhone] = useState(account.phone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("Le prénom et le nom sont obligatoires.");
      setSaving(false);
      return;
    }

    const fullName = `${trimmedFirstName} ${trimmedLastName}`;

    // 1) Métadonnées utilisateur (source du prénom / nom / téléphone)
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        full_name: fullName,
        phone: trimmedPhone || null,
      },
    });

    if (metadataError) {
      setError(
        `Impossible d'enregistrer vos informations : ${metadataError.message}`
      );
      setSaving(false);
      return;
    }

    // 2) Table profiles (colonne full_name, utilisée par le portail admin)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", account.userId);

    if (profileError) {
      setError(
        `Vos informations ont été enregistrées, mais la synchronisation du profil a échoué : ${profileError.message}`
      );
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
  };

  return (
    <SectionCard
      title="Profil"
      description="Vos informations personnelles, visibles par notre support."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className={inputClass}
              placeholder="Marie"
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
              className={inputClass}
              placeholder="Dupont"
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
            Téléphone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+33 6 12 34 56 78"
          />
          <p className="mt-1 text-xs italic text-muted-foreground/60">
            (Optionnel — uniquement pour le support d&apos;urgence)
          </p>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && (
          <SuccessMessage>
            Vos informations ont bien été enregistrées.
          </SuccessMessage>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </form>
    </SectionCard>
  );
}

// ============================================
// A4.3 — Mot de passe
// ============================================
// Supabase n'expose pas de vérification du mot de passe courant : on la
// simule avec un signInWithPassword sur l'e-mail de l'utilisateur connecté.
// La session est simplement rafraîchie si le mot de passe est correct.
function PasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux nouveaux mots de passe ne sont pas identiques.");
      setSaving(false);
      return;
    }

    if (newPassword === currentPassword) {
      setError(
        "Le nouveau mot de passe est identique à l'ancien. Choisissez-en un différent."
      );
      setSaving(false);
      return;
    }

    // 1) Vérification du mot de passe actuel
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setError("Le mot de passe actuel est incorrect.");
      setSaving(false);
      return;
    }

    // 2) Changement effectif
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const message = updateError.message.toLowerCase();
      if (message.includes("should be different")) {
        setError(
          "Le nouveau mot de passe est identique à l'ancien. Choisissez-en un différent."
        );
      } else if (message.includes("weak") || message.includes("password")) {
        setError(
          `Le nouveau mot de passe a été refusé : ${updateError.message}`
        );
      } else {
        setError(
          `Le changement de mot de passe a échoué : ${updateError.message}`
        );
      }
      setSaving(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setSaving(false);
  };

  return (
    <SectionCard
      title="Mot de passe"
      description="Modifiez votre mot de passe. Le mot de passe actuel est demandé par sécurité."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-1.5 block text-sm font-medium"
          >
            Mot de passe actuel *
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="newPassword"
              className="mb-1.5 block text-sm font-medium"
            >
              Nouveau mot de passe *
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-muted-foreground/60">
              8 caractères minimum
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="mb-1.5 block text-sm font-medium"
            >
              Confirmer le nouveau mot de passe *
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && (
          <SuccessMessage>
            Votre mot de passe a bien été modifié.
          </SuccessMessage>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Modification..." : "Modifier le mot de passe"}
        </Button>
      </form>
    </SectionCard>
  );
}

// ============================================
// A4.4 — Adresse e-mail
// ============================================
// Supabase envoie DEUX e-mails de confirmation (ancienne + nouvelle adresse)
// lorsque « Secure email change » est activé : le changement n'est effectif
// qu'une fois les deux liens ouverts.
function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const trimmedEmail = newEmail.trim().toLowerCase();

    if (trimmedEmail === currentEmail.toLowerCase()) {
      setError("Cette adresse est déjà celle de votre compte.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser(
      { email: trimmedEmail },
      { emailRedirectTo: `${window.location.origin}/api/auth/callback` }
    );

    if (updateError) {
      const message = updateError.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        setError("Cette adresse e-mail est déjà utilisée par un autre compte.");
      } else if (message.includes("rate") || message.includes("seconds")) {
        setError(
          "Trop de demandes en peu de temps. Patientez une minute avant de réessayer."
        );
      } else {
        setError(
          `Le changement d'adresse e-mail a échoué : ${updateError.message}`
        );
      }
      setSaving(false);
      return;
    }

    setPendingEmail(trimmedEmail);
    setNewEmail("");
    setSaving(false);
  };

  return (
    <SectionCard
      title="Adresse e-mail"
      description="L'adresse utilisée pour vous connecter et recevoir nos e-mails."
    >
      <div className="rounded-lg border border-border bg-secondary/50 p-3">
        <p className="text-xs text-muted-foreground">Adresse actuelle</p>
        <p className="mt-0.5 text-sm font-medium">{currentEmail}</p>
      </div>

      {pendingEmail ? (
        // Écran d'attente : les deux confirmations sont nécessaires.
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              <div>
                <p className="text-sm font-medium">
                  Confirmation en attente pour {pendingEmail}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Deux e-mails de confirmation viennent d&apos;être envoyés :
                  l&apos;un à votre adresse actuelle ({currentEmail}),
                  l&apos;autre à la nouvelle ({pendingEmail}).
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Le changement ne prendra effet qu&apos;une fois{" "}
                  <strong className="text-foreground">les deux liens</strong>{" "}
                  ouverts. Tant que ce n&apos;est pas fait, continuez à vous
                  connecter avec votre adresse actuelle. Pensez à vérifier vos
                  courriers indésirables.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setPendingEmail(null)}
            type="button"
          >
            Modifier une autre adresse
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="newEmail"
              className="mb-1.5 block text-sm font-medium"
            >
              Nouvelle adresse e-mail *
            </label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="prenom.nom@email.com"
            />
            <p className="mt-1 text-xs text-muted-foreground/60">
              Un e-mail de confirmation sera envoyé à votre adresse actuelle{" "}
              <em>et</em> à la nouvelle : les deux liens doivent être ouverts.
            </p>
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button type="submit" disabled={saving}>
            {saving ? "Envoi..." : "Changer d'adresse e-mail"}
          </Button>
        </form>
      )}
    </SectionCard>
  );
}

// ============================================
// A4.6 — Suppression de compte (RGPD)
// ============================================
function DangerZoneSection() {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (confirmation.trim() !== "SUPPRIMER") {
      setError(
        "Saisissez SUPPRIMER (en majuscules) dans le champ pour confirmer."
      );
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "La suppression du compte a échoué. Veuillez réessayer."
        );
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setError(
        "Une erreur réseau est survenue. Vérifiez votre connexion et réessayez."
      );
      setDeleting(false);
    }
  };

  return (
    <SectionCard
      danger
      title="Supprimer mon compte"
      description="Cette action est définitive et irréversible."
    >
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-muted-foreground">
        <p>Seront supprimés définitivement :</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>votre compte et vos informations personnelles ;</li>
          <li>l&apos;historique de vos vidéos générées ;</li>
          <li>l&apos;historique de vos crédits et de vos abonnements.</li>
        </ul>
        <p className="mt-3">
          Si vous avez un abonnement en cours, résiliez-le d&apos;abord depuis{" "}
          <a href="/dashboard/billing" className="text-primary hover:underline">
            Mon abonnement
          </a>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="deleteConfirmation"
            className="mb-1.5 block text-sm font-medium"
          >
            Pour confirmer, saisissez{" "}
            <span className="font-mono font-semibold">SUPPRIMER</span>
          </label>
          <input
            id="deleteConfirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            className={inputClass}
            placeholder="SUPPRIMER"
          />
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button
          type="submit"
          variant="destructive"
          disabled={deleting || confirmation.trim() !== "SUPPRIMER"}
        >
          {deleting
            ? "Suppression en cours..."
            : "Supprimer définitivement mon compte"}
        </Button>
      </form>
    </SectionCard>
  );
}

// Lecture de `?message=email_changed` (redirection produite par le callback
// après confirmation). useSearchParams impose une frontière Suspense.
function EmailChangedBanner() {
  const searchParams = useSearchParams();

  if (searchParams.get("message") !== "email_changed") {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-green-400">
            Adresse e-mail confirmée
          </p>
          <p className="mt-1 text-sm text-green-400/80">
            Votre changement d&apos;adresse e-mail a bien été pris en compte.
            Utilisez désormais cette adresse pour vous connecter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, plan, full_name")
      .eq("id", user.id)
      .single();

    // Repli sur `profiles.full_name` si les métadonnées sont incomplètes
    // (comptes créés avant l'ajout des champs prénom / nom).
    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      readMetadataString(metadata, "full_name") || profile?.full_name || "";
    const [fallbackFirstName = "", ...fallbackRest] = fullName.split(" ");

    setAccount({
      userId: user.id,
      email: user.email ?? "",
      firstName:
        readMetadataString(metadata, "first_name") || fallbackFirstName,
      lastName:
        readMetadataString(metadata, "last_name") || fallbackRest.join(" "),
      phone: readMetadataString(metadata, "phone"),
      credits: profile?.credits ?? 0,
      plan: profile?.plan ?? null,
    });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (loading || !account) {
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
    <div className="flex h-screen flex-col">
      <DashboardHeader credits={account.credits} plan={account.plan} />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Suspense fallback={null}>
            <EmailChangedBanner />
          </Suspense>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Mon compte</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez vos informations personnelles et vos identifiants de
              connexion
            </p>
          </div>

          <div className="space-y-6">
            <ProfileSection account={account} />
            <PasswordSection email={account.email} />
            <EmailSection currentEmail={account.email} />
            <DangerZoneSection />
          </div>
        </div>
      </div>
    </div>
  );
}
