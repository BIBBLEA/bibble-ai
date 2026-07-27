"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { DashboardHeader } from "@/components/dashboard/header";
import { VideoGenerator } from "@/components/dashboard/video-generator";

export default function DashboardPage() {
  const router = useRouter();
  const [credits, setCredits] = useState<number>(0);
  const [plan, setPlan] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    videoId: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les données utilisateur
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
      .select("credits, plan, full_name")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setCredits(profile.credits);
      setPlan(profile.plan);
      const name = (profile as { full_name?: string }).full_name;
      if (name) {
        setFirstName(name.split(" ")[0]);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Générer une vidéo
  const handleGenerate = async (data: {
    script: string;
    avatarId: string;
    voiceId: string;
    format: string;
  }) => {
    setIsGenerating(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.redirect) {
          router.push(result.redirect);
        }
        throw new Error(result.error || "Erreur lors de la génération");
      }

      // Mettre à jour les crédits localement
      setCredits(result.data.credits_remaining);
      setGenerationResult({
        videoId: result.data.video_id,
        status: result.data.status,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la génération vidéo. Veuillez réessayer plus tard."
      );
    } finally {
      setIsGenerating(false);
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
      <DashboardHeader credits={credits} plan={plan} firstName={firstName} />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Créer une vidéo publicitaire</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configurez votre avatar, écrivez votre script et générez votre
              vidéo en un clic.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Success message after generation */}
          {generationResult && (
            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-green-500">
                    Vidéo en cours de génération
                  </p>
                  <p className="text-sm text-green-500/80">
                    Votre vidéo est en train d&apos;être créée. Consultez
                    l&apos;onglet &quot;Mes vidéos&quot; pour suivre l&apos;avancement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGenerationResult(null)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Video Generator Form */}
          <VideoGenerator
            credits={credits}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}
