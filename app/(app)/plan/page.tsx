import { phaseLabel, previewUpcoming, type Cursor, type Phase } from "@/lib/program";
import { getAthlete, getProgramConfig, getTrainingMaxes } from "@/lib/queries";
import { UpcomingList } from "@/components/plan/UpcomingList";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

/** How many upcoming sessions to preview (~2 weeks: rest of this week + a peek ahead). */
const PREVIEW_COUNT = 8;

export default async function PlanPage() {
  const cfg = await getProgramConfig();
  if (!cfg) {
    return (
      <>
        <PageHeader title="Plan" />
        <div className="p-5">
          <EmptyState
            title="No program configured"
            hint="Set DATABASE_URL in .env.local, then run: npm run db:push && npm run db:seed"
          />
        </div>
      </>
    );
  }

  const [tms, athlete] = await Promise.all([getTrainingMaxes(), getAthlete()]);

  const phase = cfg.phase as Phase;
  const cursor: Cursor = {
    phase,
    weekIndex: cfg.weekIndex,
    dayNumber: cfg.dayNumber,
    cycleIndex: cfg.cycleIndex,
  };

  const sessions = previewUpcoming({
    cursor,
    tms,
    plateIncrementKg: athlete?.plateIncrementKg ?? 2.5,
    count: PREVIEW_COUNT,
  });

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`${phaseLabel(phase)} - Week ${cfg.weekIndex} - Cycle ${cfg.cycleIndex}`}
      />

      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted">
          Your next {PREVIEW_COUNT} queued sessions. Sessions are a flexible queue - do the next
          day whenever it suits your week.
        </p>
        <UpcomingList sessions={sessions} />
      </div>
    </>
  );
}
