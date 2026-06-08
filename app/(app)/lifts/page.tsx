import { getLifts, getTmEvents } from "@/lib/queries";
import { LIFT_NAMES, type LiftName } from "@/lib/program";
import { PageHeader } from "@/components/ui";
import { TmEditor } from "@/components/lifts/TmEditor";
import { LineChartCard, type LinePoint } from "@/components/charts/LineChartCard";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const ORDER: LiftName[] = ["bench", "deadlift", "squat"];

export default async function LiftsPage() {
  const [lifts, events] = await Promise.all([getLifts(), getTmEvents()]);
  const byId = new Map(lifts.map((l) => [l.id as LiftName, l]));

  const historyByLift = new Map<LiftName, LinePoint[]>();
  for (const e of events) {
    const lid = e.liftId as LiftName;
    const arr = historyByLift.get(lid) ?? [];
    arr.push({ label: formatDate(e.at), value: e.newTm });
    historyByLift.set(lid, arr);
  }

  return (
    <>
      <PageHeader title="Lifts" subtitle="Training Maxes & history" />

      <div className="flex flex-col gap-4 p-5">
        {ORDER.map((lid) => {
          const lift = byId.get(lid);
          const history = historyByLift.get(lid) ?? [];
          return (
            <div key={lid} className="card">
              <TmEditor liftId={lid} currentTm={lift?.trainingMaxKg ?? null} />
              {history.length > 1 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted">TM history</div>
                  <LineChartCard data={history} unit="kg" />
                </div>
              ) : null}
            </div>
          );
        })}

        <p className="px-1 text-center text-xs text-muted">
          {LIFT_NAMES.bench} / {LIFT_NAMES.deadlift} progress automatically from heavy AMRAP sets;
          you can always override here.
        </p>
      </div>
    </>
  );
}
