import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// ============================================
// GET /api/video-status?video_id=xxx
// ============================================
// Vérifie le statut d'une vidéo en cours de génération
// auprès de l'API HeyGen v3 et met à jour la base de données
// ============================================

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const HEYGEN_BASE_URL = "https://api.heygen.com";

export async function GET(request: NextRequest) {
  try {
    // --- Authentification ---
    const authHeader = request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader || "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    // --- Récupérer le video_id depuis les query params ---
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("video_id");

    if (!videoId) {
      return NextResponse.json(
        { error: "Le paramètre video_id est requis." },
        { status: 400 }
      );
    }

    // --- Appel à l'API HeyGen v3 pour le statut ---
    const heygenResponse = await fetch(
      `${HEYGEN_BASE_URL}/v3/videos/${videoId}`,
      {
        headers: {
          "x-api-key": HEYGEN_API_KEY,
          "Accept": "application/json",
        },
      }
    );

    if (!heygenResponse.ok) {
      console.error("HeyGen v3 status error:", heygenResponse.status);
      return NextResponse.json(
        { error: "Impossible de récupérer le statut de la vidéo." },
        { status: 502 }
      );
    }

    const heygenData = await heygenResponse.json();
    const videoData = heygenData.data;

    // v3 statuses: "pending", "processing", "completed", "failed"
    const status = videoData?.status || "processing";

    // --- Mettre à jour la base de données si la vidéo est terminée ---
    if (status === "completed" || status === "failed") {
      const supabaseAdmin = createClient<Database>(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      if (status === "completed") {
        await supabaseAdmin
          .from("video_generations")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            video_url: videoData.video_url || null,
            thumbnail_url: videoData.thumbnail_url || null,
            duration_seconds: videoData.duration || null,
          })
          .eq("heygen_video_id", videoId)
          .eq("user_id", user.id);
      } else {
        await supabaseAdmin
          .from("video_generations")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: videoData.error || videoData.message || "Erreur inconnue",
          })
          .eq("heygen_video_id", videoId)
          .eq("user_id", user.id);
      }
    }

    // --- Réponse ---
    return NextResponse.json({
      success: true,
      data: {
        video_id: videoId,
        status: status,
        video_url: videoData?.video_url || null,
        thumbnail_url: videoData?.thumbnail_url || null,
        duration: videoData?.duration || null,
        error: videoData?.error || null,
      },
    });
  } catch (error) {
    console.error("Error in /api/video-status:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
