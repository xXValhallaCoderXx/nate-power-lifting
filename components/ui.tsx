import type { Role } from "@/lib/program";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-bg/80 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="truncate text-sm text-muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  heavy: "bg-heavy/15 text-heavy border-heavy/30",
  medium: "bg-medium/15 text-medium border-medium/30",
  light: "bg-light/15 text-light border-light/30",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`chip uppercase tracking-wide ${ROLE_STYLES[role]}`}>{role}</span>;
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface2 px-3 py-2.5 text-center">
      <div className="text-xl font-bold leading-none tabular-nums">{value}</div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card text-center text-muted">
      <p className="font-semibold text-white">{title}</p>
      {hint ? <p className="mt-1 text-sm leading-relaxed">{hint}</p> : null}
    </div>
  );
}
