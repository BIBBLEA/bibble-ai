"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Voyez à quoi ressemble une pub qui capte l&apos;attention
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Un script, un avatar, quelques clics. Votre créative est prête à partir en campagne.
          </p>
        </div>

        <div className="mt-10">
          <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl">
            <div className="aspect-video w-full">
              <video
                ref={videoRef}
                src="/demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>

            {/* Unmute Button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 flex h-10 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-black/80"
            >
              {isMuted ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  Activer le son
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Couper le son
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            9 entrepreneurs sur 10 constatent une baisse de leurs coûts publicitaires dès le premier mois.
          </p>

          {/* CTA Section under video */}
          <div className="mt-12 text-center">
            <Link href="/login">
              <button className="rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90">
                Créer mon premier Avatar IA
              </button>
            </Link>
            <p className="mt-4 text-sm text-white/70">
              Paiement sécurisé via Stripe • Sans engagement
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
