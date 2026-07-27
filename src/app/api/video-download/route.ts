import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// ============================================
// GET /api/video-download?video_id=xxx
// ============================================
// Récupère une URL de téléchargement fraîche auprès de HeyGen v3
// pour éviter les erreurs "Access Denied" dues à l'expiration des URLs.
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

    // --- Appel à l'API HeyGen v3 pour obtenir les données fraîches ---
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
      console.error("HeyGen v3 download error:", heygenResponse.status);
      return NextResponse.json(
        { error: "Impossible de récupérer l'URL de téléchargement." },
        { status: 502 }
      );
    }

    const heygenData = await heygenResponse.json();
    const videoData = heygenData.data;

    if (!videoData || !videoData.video_url) {
      return NextResponse.json(
        { error: "Vidéo non disponible ou non terminée." },
        { status: 404 }
      );
    }

    // --- Optionnel : Mettre à jour l'URL en base si elle a changé ---
    // (Cela permet d'avoir une URL valide pendant quelques heures de plus)
    const supabaseAdmin = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin
      .from("video_generations")
      .update({
        video_url: videoData.video_url,
        thumbnail_url: videoData.thumbnail_url || null,
      })
      .eq("heygen_video_id", videoId)
      .eq("user_id", user.id);

    // --- Réponse avec l'URL fraîche ---
    return NextResponse.json({
      success: true,
      video_url: videoData.video_url,
    });
  } catch (error) {
    console.error("Error in /api/video-download:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
