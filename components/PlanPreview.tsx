import { LIFT_NAMES, type LiftName, type PrescribedSet } from "@/lib/program";
import { kg } from "@/lib/format";
import { RoleBadge } from "@/components/ui";

interface GroupedLine {
  label: string;
  weight: number;
  reps: number;
  count: number;
  isAmrap: boolean;
  isWarmup: boolean;
}

/** Collapse identical consecutive sets into "N x reps @ weight" lines. */
function groupSets(sets: PrescribedSet[]): GroupedLine[] {
  const lines: GroupedLine[] = [];
  for (const s of sets) {
    const last = lines[lines.length - 1];
    if (
      last &&
      last.label === s.label &&
      last.weight === s.targetWeightKg &&
      last.reps === s.targetReps &&
      last.isAmrap === s.isAmrap
    ) {
      last.count++;
    } else {
      lines.push({
        label: s.label,
        weight: s.targetWeightKg,
        reps: s.targetReps,
        count: 1,
        isAmrap: s.isAmrap,
        isWarmup: s.isWarmup,
      });
    }
  }
  return lines;
}

export function PlanPreview({ sets }: { sets: PrescribedSet[] }) {
  const byLift = new Map<LiftName, PrescribedSet[]>();
  for (const s of sets) {
    const arr = byLift.get(s.liftId) ?? [];
    arr.push(s);
    byLift.set(s.liftId, arr);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...byLift.entries()].map(([liftId, liftSets]) => {
        const role = liftSets.find((s) => !s.isWarmup)?.role ?? liftSets[0].role;
        return (
          <div key={liftId} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{LIFT_NAMES[liftId]}</h3>
              <RoleBadge role={role} />
            </div>
            <ul className="flex flex-col gap-1.5">
              {groupSets(liftSets).map((line, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                    line.isWarmup ? "text-muted" : "bg-surface2"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{line.label}</span>
                    {line.isAmrap ? (
                      <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                        AMRAP
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-sm">
                    {line.count} x {line.reps}
                    {line.isAmrap ? "+" : ""} @ {kg(line.weight)} kg
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
