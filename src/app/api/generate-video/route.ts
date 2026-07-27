import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import {
  AVATARS,
  VOICES,
  STUDIO_AVATAR_IDS,
  MAX_SCRIPT_WORDS,
  MAX_SCRIPT_CHARACTERS,
  getVideoFormat,
} from "@/lib/heygen-config";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const HEYGEN_BASE_URL = "https://api.heygen.com";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader || "" },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { script, avatarId, voiceId, format, sceneDescription } = body;

    if (!script || typeof script !== "string" || script.trim().length === 0) {
      return NextResponse.json(
        { error: "Le script est requis." },
        { status: 400 }
      );
    }

    const trimmedScript = script.trim();

    if (trimmedScript.length > MAX_SCRIPT_CHARACTERS) {
      return NextResponse.json(
        { error: `Le script ne doit pas dépasser ${MAX_SCRIPT_CHARACTERS} caractères.` },
        { status: 400 }
      );
    }

    const wordCount = countWords(trimmedScript);
    if (wordCount > MAX_SCRIPT_WORDS) {
      return NextResponse.json(
        {
          error: `Le script est trop long (${wordCount} mots). Maximum autorisé : ${MAX_SCRIPT_WORDS} mots (~25 secondes).`,
        },
        { status: 400 }
      );
    }

    if (!format || !["9:16", "16:9"].includes(format)) {
      return NextResponse.json(
        { error: "Le format doit être '9:16' ou '16:9'." },
        { status: 400 }
      );
    }

    const selectedAvatar = AVATARS.find((avatar) => avatar.id === avatarId);
    if (!selectedAvatar) {
      return NextResponse.json({ error: "Avatar invalide." }, { status: 400 });
    }

    const selectedVoice = VOICES.find((voice) => voice.id === voiceId);
    if (!selectedVoice) {
      return NextResponse.json({ error: "Voix invalide." }, { status: 400 });
    }

    const supabaseAdmin = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credits, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil utilisateur introuvable." },
        { status: 404 }
      );
    }

    if (profile.credits <= 0) {
      return NextResponse.json(
        { error: "Vous n'avez plus de crédits.", redirect: "/dashboard/billing" },
        { status: 403 }
      );
    }

    // Build HeyGen V3 payload
    const videoDimensions = getVideoFormat(format as "16:9" | "9:16");
    const heygenPayload: Record<string, unknown> = {
      type: "avatar",
      avatar_id: selectedAvatar.id,
      script: trimmedScript,
      voice_id: selectedVoice.id,
      aspect_ratio: format,
      dimension: {
        width: videoDimensions.width,
        height: videoDimensions.height,
      },
      fit: "cover",
    };

    // Add engine for studio avatars
    if (STUDIO_AVATAR_IDS.has(selectedAvatar.id)) {
      heygenPayload.engine = { type: "avatar_iii" };
    }

    // Add scene description as background prompt if provided
    if (sceneDescription && sceneDescription.trim().length > 0) {
      heygenPayload.background = {
        type: "ai_generated",
        prompt: sceneDescription.trim(),
      };
    }

    console.log("HeyGen v3 payload:", JSON.stringify(heygenPayload));

    const heygenResponse = await fetch(`${HEYGEN_BASE_URL}/v3/videos`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(heygenPayload),
    });

    const heygenData = await heygenResponse.json();

    if (heygenData.error || !heygenResponse.ok) {
      console.error("HeyGen v3 API Error:", JSON.stringify(heygenData));
      return NextResponse.json(
        {
          error: "Erreur lors de la génération vidéo.",
          details: heygenData.error || heygenData.message || "Erreur HeyGen inconnue",
        },
        { status: 502 }
      );
    }

    const videoId = heygenData.data?.video_id;
    if (!videoId) {
      return NextResponse.json(
        { error: "Réponse inattendue de l'API." },
        { status: 502 }
      );
    }

    const newBalance = profile.credits - 1;

    await supabaseAdmin
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", user.id);

    const { data: videoRecord } = await supabaseAdmin
      .from("video_generations")
      .insert({
        user_id: user.id,
        heygen_video_id: videoId,
        script: trimmedScript,
        avatar_id: selectedAvatar.id,
        voice_id: selectedVoice.id,
        format: format as "9:16" | "16:9",
        status: "processing",
      })
      .select("id")
      .single();

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      type: "usage_debit",
      amount: -1,
      balance_after: newBalance,
      description: `Génération vidéo — ${format}`,
      reference_id: videoRecord?.id || videoId,
    });

    return NextResponse.json({
      success: true,
      data: {
        video_id: videoId,
        record_id: videoRecord?.id,
        status: "processing",
        credits_remaining: newBalance,
      },
      message: "Vidéo en cours de génération.",
    });
  } catch (error) {
    console.error("Unexpected error in /api/generate-video:", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
