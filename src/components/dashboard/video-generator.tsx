"use client";

import { useEffect, useRef, useState } from "react";
import {
  AVATARS,
  VOICES,
  getCompatibleAvatars,
  MAX_SCRIPT_CHARACTERS,
  type VideoFormat,
} from "@/lib/heygen-config";

interface VideoGeneratorProps {
  credits: number;
  onGenerate: (data: {
    script: string;
    avatarId: string;
    voiceId: string;
    format: string;
  }) => void;
  isGenerating: boolean;
}

export function VideoGenerator({
  credits,
  onGenerate,
  isGenerating,
}: VideoGeneratorProps) {
  const [script, setScript] = useState("");
  const [format, setFormat] = useState<VideoFormat>("16:9");
  const [selectedAvatar, setSelectedAvatar] = useState(
    getCompatibleAvatars("16:9")[0]?.id ?? AVATARS[0].id
  );
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const charactersUsed = script.length;
  const isScriptEmpty = !script.trim();

  const compatibleAvatars = getCompatibleAvatars(format);

  useEffect(() => {
    const stillCompatible = compatibleAvatars.some(
      (avatar) => avatar.id === selectedAvatar
    );
    if (!stillCompatible && compatibleAvatars.length > 0) {
      setSelectedAvatar(compatibleAvatars[0].id);
    }
  }, [format, compatibleAvatars, selectedAvatar]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSubmit = () => {
    if (isScriptEmpty || credits === 0 || isGenerating) return;
    onGenerate({
      script: script.trim(),
      avatarId: selectedAvatar,
      voiceId: selectedVoice,
      format,
    });
  };

  const playVoicePreview = (voiceId: string, previewUrl: string) => {
    if (!previewUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoice(voiceId);

    audio.play().catch(() => setPlayingVoice(null));
    audio.onended = () => {
      setPlayingVoice(null);
      audioRef.current = null;
    };
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium">Format vidéo</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat("9:16")}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
              format === "9:16"
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-border/80"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                format === "9:16" ? "bg-primary text-white" : "bg-secondary"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">9:16</p>
              <p className="text-xs text-muted-foreground">TikTok, Shorts, Reels</p>
            </div>
          </button>

          <button
            onClick={() => setFormat("16:9")}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
              format === "16:9"
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-border/80"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                format === "16:9" ? "bg-primary text-white" : "bg-secondary"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">16:9</p>
              <p className="text-xs text-muted-foreground">YouTube, Facebook Ads</p>
            </div>
          </button>
        </div>
      </div>

      {/* Avatar Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium">Avatar</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {compatibleAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => setSelectedAvatar(avatar.id)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                selectedAvatar === avatar.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-border/80 hover:bg-secondary/50"
              }`}
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <img
                  src={avatar.preview}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xs font-medium">{avatar.name}</span>
              <span className="text-[10px] text-muted-foreground text-center">
                {avatar.name === "Étienne M." || avatar.name === "Etienne M." ? "Français - Homme" : avatar.style}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {avatar.type === "photo_avatar" ? "Photo HD" : "Studio v3"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium">Voix</label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {VOICES.map((voice) => (
            <div
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                selectedVoice === voice.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-border/80 hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selectedVoice === voice.id ? "bg-primary text-white" : "bg-secondary"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">{voice.name}</p>
                  <p className="text-xs text-muted-foreground">{voice.language} — {voice.gender}</p>
                </div>
              </div>

              {voice.preview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoicePreview(voice.id, voice.preview);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    playingVoice === voice.id
                      ? "animate-pulse bg-primary text-white"
                      : "bg-secondary hover:bg-primary/20 hover:text-primary"
                  }`}
                >
                  {playingVoice === voice.id ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Script Input */}
      <div>
        <label className="mb-2 block text-sm font-medium">Script publicitaire</label>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT_CHARACTERS))}
          placeholder="Écrivez votre script ici..."
          className="h-32 w-full resize-none rounded-xl border border-border bg-secondary p-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          disabled={credits === 0}
          maxLength={MAX_SCRIPT_CHARACTERS}
        />
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">
            Maximum 400 caractères pour garantir une vidéo de 22 secondes max
          </span>
          <span className="text-muted-foreground">
            {script.length} / {MAX_SCRIPT_CHARACTERS} caractères
          </span>
        </div>
        {credits === 0 && (
          <p className="mt-2 text-xs text-amber-400">
            Vous n&apos;avez plus de crédits disponibles pour générer une vidéo.{" "}
            <a
              href="/dashboard/billing"
              className="font-medium underline underline-offset-2 hover:text-amber-300"
            >
              Mettre à niveau mon abonnement
            </a>
          </p>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSubmit}
        disabled={!script.trim() || credits === 0 || isGenerating}
        className="w-full rounded-xl bg-primary py-4 text-center text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Génération en cours...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            Générer la vidéo (1 crédit)
          </span>
        )}
      </button>
    </div>
  );
}
