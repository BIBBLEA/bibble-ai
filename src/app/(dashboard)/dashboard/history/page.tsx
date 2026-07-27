"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { DashboardHeader } from "@/components/dashboard/header";
import { AVATAR_LABEL_BY_ID } from "@/lib/heygen-config";

interface VideoRecord {
  id: string;
  heygen_video_id: string | null;
  script: string;
  avatar_id: string;
  format: "9:16" | "16:9";
  status: "pending" | "processing" | "completed" | "failed";
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-yellow-500 bg-yellow-500/10" },
  processing: { label: "En cours", color: "text-blue-500 bg-blue-500/10" },
  completed: { label: "Terminée", color: "text-green-500 bg-green-500/10" },
  failed: { label: "Échouée", color: "text-red-500 bg-red-500/10" },
};

export default function HistoryPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load user data and videos
  const loadData = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      router.push("/login");
      return;
    }

    setSession(currentSession);

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("id", currentSession.user.id)
      .single();

    if (profile) {
      setCredits(profile.credits);
      setPlan(profile.plan);
    }

    // Fetch videos
    const { data: videosData } = await supabase
      .from("video_generations")
      .select("*")
      .eq("user_id", currentSession.user.id)
      .order("created_at", { ascending: false });

    if (videosData) {
      setVideos(videosData as VideoRecord[]);
    }

    setLoading(false);
  }, [router]);

  // Handle video download with fresh URL
  const handleDownload = async (heygenVideoId: string) => {
    if (!session || !heygenVideoId) return;

    try {
      setDownloadingId(heygenVideoId);
      const response = await fetch(
        `/api/video-download?video_id=${heygenVideoId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.video_url) {
          // Open the fresh URL in a new tab
          window.open(result.video_url, "_blank");
        }
      } else {
        alert("Impossible de récupérer le lien de téléchargement. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Une erreur est survenue lors de la récupération du lien.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Poll for processing videos to update their status
  const pollProcessingVideos = useCallback(async () => {
    if (!session) return;

    const processingVideos = videos.filter((v) => v.status === "processing");
    if (processingVideos.length === 0) return;

    for (const video of processingVideos) {
      if (!video.heygen_video_id) continue;

      try {
        const response = await fetch(
          `/api/video-status?video_id=${video.heygen_video_id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (
            result.data.status === "completed" ||
            result.data.status === "failed"
          ) {
            // Reload all data to get fresh state
            await loadData();
            return;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }
  }, [session, videos, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll every 10 seconds for processing videos
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(pollProcessingVideos, 10000);
    return () => clearInterval(interval);
  }, [videos, pollProcessingVideos]);

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
            <h2 className="text-2xl font-bold">Mes vidéos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Historique de toutes vos vidéos générées
            </p>
          </div>

          {/* Videos List */}
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 py-16">
              <svg
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-4 text-muted-foreground">
                Aucune vidéo générée pour le moment
              </p>
              <a
                href="/dashboard"
                className="mt-2 text-sm text-primary hover:underline"
              >
                Créer ma première vidéo →
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail / Avatar placeholder */}
                    <div className="flex-shrink-0">
                      {video.status === "processing" ? (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <svg
                            className="h-6 w-6 animate-spin text-blue-500"
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
                        </div>
                      ) : video.status === "completed" && video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt="Miniature"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : video.status === "completed" ? (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                          <svg
                            className="h-6 w-6 text-green-500"
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
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                          <svg
                            className="h-6 w-6 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {video.script}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded bg-secondary px-2 py-0.5">
                          {video.format}
                        </span>
                        <span className="rounded bg-secondary px-2 py-0.5">
                          {AVATAR_LABEL_BY_ID[video.avatar_id] || "Avatar"}
                        </span>
                        {video.duration_seconds && (
                          <span>{Math.round(video.duration_seconds)}s</span>
                        )}
                        <span>
                          {new Date(video.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Europe/Paris",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusLabels[video.status]?.color
                        }`}
                      >
                        {statusLabels[video.status]?.label}
                      </span>

                      {video.status === "completed" && video.heygen_video_id && (
                        <button
                          onClick={() => handleDownload(video.heygen_video_id!)}
                          disabled={downloadingId === video.heygen_video_id}
                          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                        >
                          {downloadingId === video.heygen_video_id ? (
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                              />
                            </svg>
                          )}
                          Télécharger
                        </button>
                      )}

                      {video.status === "processing" && (
                        <span className="text-xs text-blue-400 animate-pulse">
                          Génération en cours...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
