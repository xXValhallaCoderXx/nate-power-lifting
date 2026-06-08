import Link from "next/link";
import {
  generateSession,
  phaseLabel,
  WEEKLY_TEMPLATE,
  WAVE,
  type Phase,
} from "@/lib/program";
import { getActiveSession, getAthlete, getProgramConfig, getTrainingMaxes } from "@/lib/queries";
import { skipDay, startSession } from "@/lib/actions";
import { PlanPreview } from "@/components/PlanPreview";
import { PageHeader, StatPill, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const cfg = await getProgramConfig();
  if (!cfg) {
    return (
      <>
        <PageHeader title="Today" />
        <div className="p-5">
          <EmptyState
            title="No program configured"
            hint="Set DATABASE_URL in .env.local, then run: npm run db:push && npm run db:seed"
          />
        </div>
      </>
    );
  }

  const [tms, active, athlete] = await Promise.all([
    getTrainingMaxes(),
    getActiveSession(),
    getAthlete(),
  ]);

  const phase = cfg.phase as Phase;
  const template = WEEKLY_TEMPLATE[cfg.dayNumber];
  const sets = generateSession({
    tms,
    phase,
    weekIndex: cfg.weekIndex,
    dayNumber: cfg.dayNumber,
    plateIncrementKg: athlete?.plateIncrementKg ?? 2.5,
  });

  const isWaveDeload = phase === "wave" && WAVE[cfg.weekIndex]?.isDeload;
  const needsSquatCalibration =
    template?.slots.some((s) => s.lift === "squat") && tms.squat == null;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${phaseLabel(phase)} - Week ${cfg.weekIndex} - Cycle ${cfg.cycleIndex}`}
      />

      <div className="flex flex-col gap-4 p-5">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-card">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                Day {cfg.dayNumber}
              </div>
              <div className="mt-0.5 text-2xl font-bold tracking-tight">{template?.name ?? "Rest"}</div>
            </div>
            {isWaveDeload ? (
              <span className="chip border-light/30 bg-light/15 text-light">Deload</span>
            ) : null}
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <StatPill label="Bench TM" value={tms.bench != null ? `${tms.bench}` : "-"} />
            <StatPill label="Deadlift TM" value={tms.deadlift != null ? `${tms.deadlift}` : "-"} />
            <StatPill label="Squat TM" value={tms.squat != null ? `${tms.squat}` : "TBD"} />
          </div>
        </div>

        {active ? (
          <Link href={`/session/${active.id}`} className="btn-primary w-full">
            Resume session in progress
          </Link>
        ) : (
          <form action={startSession}>
            <button type="submit" className="btn-primary w-full text-lg">
              Start Session
            </button>
          </form>
        )}

        {needsSquatCalibration ? (
          <EmptyState
            title="Squat needs calibration"
            hint="Find a clean 5 @ RPE 7, then set the squat TM on the Lifts tab."
          />
        ) : null}

        <div>
          <h2 className="section-title mb-2 block">Prescribed work</h2>
          {sets.length > 0 ? (
            <PlanPreview sets={sets} />
          ) : (
            <EmptyState title="Nothing prescribed" hint="Set your Training Maxes on the Lifts tab." />
          )}
        </div>

        {!active ? (
          <form action={skipDay}>
            <button type="submit" className="btn-secondary w-full text-sm">
              Skip this day
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
