"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

interface SiteSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string | null;
  credits: number;
  created_at: string;
}

export default function AdminPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "users">("settings");
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getAuthHeader = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return `Bearer ${data.session?.access_token || ""}`;
  }, []);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }

      // Verify via API (server-side check)
      const res = await fetch("/api/admin?resource=settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 403) {
        router.push("/");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };
    checkAccess();
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!authorized) return;

    const fetchData = async () => {
      const auth = await getAuthHeader();

      const [settingsRes, usersRes] = await Promise.all([
        fetch("/api/admin?resource=settings", { headers: { Authorization: auth } }),
        fetch("/api/admin?resource=users", { headers: { Authorization: auth } }),
      ]);

      if (settingsRes.ok) {
        const { data } = await settingsRes.json();
        setSettings(data || []);
      }
      if (usersRes.ok) {
        const { data } = await usersRes.json();
        setUsers(data || []);
      }
    };
    fetchData();
  }, [authorized, getAuthHeader]);

  const updateSetting = async (key: string, value: string) => {
    setSaving(key);
    setMessage(null);
    const auth = await getAuthHeader();

    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_setting", key, value }),
    });

    if (res.ok) {
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value } : s))
      );
      setMessage({ type: "success", text: `"${key}" mis à jour.` });
    } else {
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde." });
    }
    setSaving(null);
  };

  const adjustCredits = async (userId: string, delta: number) => {
    setSaving(userId);
    setMessage(null);
    const auth = await getAuthHeader();

    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust_credits", userId, delta }),
    });

    if (res.ok) {
      const { credits } = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, credits } : u))
      );
      setMessage({ type: "success", text: "Crédits mis à jour." });
    } else {
      setMessage({ type: "error", text: "Erreur lors de l'ajustement." });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Panneau Admin — Bibble AI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestion du contenu et des utilisateurs
            </p>
          </div>
          <a
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
          >
            Retour au site
          </a>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Contenu du site
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gestion des clients ({users.length})
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {settings.map((setting) => (
              <div
                key={setting.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {setting.key}
                    </span>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById(
                        `setting-${setting.key}`
                      ) as HTMLInputElement | HTMLTextAreaElement;
                      if (input) updateSetting(setting.key, input.value);
                    }}
                    disabled={saving === setting.key}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving === setting.key ? "..." : "Sauvegarder"}
                  </button>
                </div>
                {setting.value.length > 80 ? (
                  <textarea
                    id={`setting-${setting.key}`}
                    defaultValue={setting.value}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-secondary p-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                ) : (
                  <input
                    id={`setting-${setting.key}`}
                    type="text"
                    defaultValue={setting.value}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Nom
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Plan
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                    Crédits
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Inscrit le
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 text-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.full_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {user.plan || "free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-foreground">
                      {user.credits}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => adjustCredits(user.id, -1)}
                          disabled={saving === user.id || user.credits <= 0}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                          title="Retirer 1 crédit"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => adjustCredits(user.id, 1)}
                          disabled={saving === user.id}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-green-500/30 text-green-400 hover:bg-green-500/10 disabled:opacity-30"
                          title="Ajouter 1 crédit"
                        >
                          +1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucun utilisateur inscrit.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
