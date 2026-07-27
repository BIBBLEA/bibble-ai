"use client";

import Link from "next/link";
import { AVATARS } from "@/lib/heygen-config";

const AVATAR_PREVIEWS = AVATARS.slice(0, 6).map((a) => ({
  name: `${a.name} — ${a.style}`,
  url: a.preview,
}));

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-white via-white to-purple-200 bg-clip-text text-transparent">
              Multipliez vos ventes avec des Ads UGC qui convertissent. Sans tourner une seule vidéo.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#F3F4F6]">
            Générez des publicités vidéos ultra-réalistes en quelques secondes. Collez votre script, choisissez votre avatar vendeur, et lancez vos campagnes sur TikTok, Instagram et YouTube.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40"
            >
              Lancer ma première vidéo →
            </Link>

            <p className="text-xs text-muted-foreground">
              Paiement sécurisé via Stripe • Sans engagement
            </p>
          </div>

          <div className="mt-12">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              Nos avatars IA photoréalistes disponibles
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {AVATAR_PREVIEWS.map((avatar) => (
                <div key={avatar.name} className="group relative">
                  <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white/20 transition-all group-hover:scale-110 group-hover:border-primary sm:h-16 sm:w-16">
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {avatar.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 border-t border-border/50 pt-8 sm:grid-cols-3 sm:gap-8">
            <div>
              <p className="text-2xl font-bold text-white">-5 min</p>
              <p className="text-sm text-muted-foreground">pour lancer une variante</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">2 formats</p>
              <p className="text-sm text-muted-foreground">9:16 & 16:9</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">1080p</p>
              <p className="text-sm text-muted-foreground">export HD</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
