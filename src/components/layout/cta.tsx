import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-purple-900/10 p-12 text-center md:p-20">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-600/10 blur-[60px]" />

          <div className="relative">
            <h2 className="text-3xl font-bold md:text-4xl">
              Passez d&apos;une idée à une pub prête à convertir
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Rejoignez les e-commerçants et agences qui multiplient leur volume de créatives sans tourner une seule vidéo.
            </p>

            <div className="mt-8">
              <Link href="/login">
                <Button size="lg" className="px-10 text-base font-semibold">
                  Lancer ma première vidéo →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
