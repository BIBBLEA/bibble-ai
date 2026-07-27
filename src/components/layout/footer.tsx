import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold">Bibble AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Vidéos publicitaires IA en quelques secondes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground md:justify-end">
            <Link href="/mentions-legales" className="transition-colors hover:text-foreground">
              Mentions légales
            </Link>
            <span>|</span>
            <Link href="/cgv" className="transition-colors hover:text-foreground">
              CGV
            </Link>
            <span>|</span>
            <Link
              href="/politique-de-confidentialite"
              className="transition-colors hover:text-foreground"
            >
              Politique de confidentialité
            </Link>
            <span>|</span>
            <a
              href="mailto:bibble.ai.contact@etik.com"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bibble AI. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
