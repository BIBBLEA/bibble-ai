import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Bibble AI Logo" className="h-10 w-auto" />
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
