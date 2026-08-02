"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };
  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Mot de passe mis à jour
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Redirection vers la connexion...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold text-white">
          Choisissez un nouveau mot de passe
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}
