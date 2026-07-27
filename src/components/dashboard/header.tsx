"use client";

interface DashboardHeaderProps {
  credits: number;
  plan: string | null;
  firstName?: string;
}

export function DashboardHeader({ credits, plan, firstName }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        {firstName ? (
          <h1 className="text-lg font-semibold">
            Bonjour, {firstName} !
          </h1>
        ) : (
          <h1 className="text-lg font-semibold">Générateur de vidéos</h1>
        )}
      </div>

      {/* Credits Display */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2">
          <svg
            className="h-4 w-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            />
          </svg>
          <span className="text-sm font-medium">
            <span className="text-primary">{credits}</span> crédit
            {credits !== 1 ? "s" : ""} restant{credits !== 1 ? "s" : ""}
          </span>
        </div>

        {plan && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
            {plan}
          </span>
        )}
      </div>
    </header>
  );
}
