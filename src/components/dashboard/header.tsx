import Link from "next/link";

interface DashboardHeaderProps {
  credits: number;
  plan: string | null;
}

export function DashboardHeader({ credits, plan }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold">Bibble AI</span>
          </Link>
          <nav className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm font-medium">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Mes Vidéos</Link>
              </li>
              <li>
                <Link href="/dashboard/billing" className="text-foreground">Facturation</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden rounded-full bg-secondary px-4 py-1.5 text-xs font-medium md:block">
            {credits} crédit{credits !== 1 ? "s" : ""} restant{credits !== 1 ? "s" : ""}
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
