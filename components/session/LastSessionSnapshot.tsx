"use client";

import { useState } from "react";
import { LIFT_NAMES, phaseLabel, type LiftName, type Phase } from "@/lib/program";
import { kg, formatDate } from "@/lib/format";
import { RoleBadge } from "@/components/ui";
import type { AccessoryLastTime, PreviousSessionSnapshot } from "@/lib/queries";

interface Line {
  label: string | null;
  weightKg: number;
  reps: number;
  rpe: number | null;
  isAmrap: boolean;
  count: number;
}

/** Collapse identical consecutive logged sets into "N x reps @ weight" lines. */
function groupSets(sets: PreviousSessionSnapshot["mainLifts"][number]["sets"]): Line[] {
  const lines: Line[] = [];
  for (const s of sets) {
    const last = lines[lines.length - 1];
    if (
      last &&
      last.label === s.label &&
      last.weightKg === s.weightKg &&
      last.reps === s.reps &&
      last.rpe === s.rpe &&
      last.isAmrap === s.isAmrap
    ) {
      last.count++;
    } else {
      lines.push({ ...s, count: 1 });
    }
  }
  return lines;
}

export function LastSessionSnapshot({
  snapshot,
  accessories,
}: {
  snapshot: PreviousSessionSnapshot | null;
  accessories: AccessoryLastTime[];
}) {
  const [open, setOpen] = useState(false);

  const hasMain = (snapshot?.mainLifts.length ?? 0) > 0;
  const hasAccessories = accessories.length > 0;
  if (!hasMain && !hasAccessories) return null;

  const subtitle = snapshot
    ? `Day ${snapshot.dayNumber} - ${phaseLabel(snapshot.phase as Phase)} Week ${snapshot.weekIndex}${
        snapshot.dateCompleted ? ` - ${formatDate(snapshot.dateCompleted)}` : ""
      }`
    : "Previous accessory work";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold">Last time</span>
          <span className="text-xs text-muted">{subtitle}</span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
          {hasMain ? (
            <div className="flex flex-col gap-3">
              {snapshot!.mainLifts.map((lift) => (
                <div key={lift.liftId}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{LIFT_NAMES[lift.liftId as LiftName]}</h4>
                    <RoleBadge role={lift.role} />
                  </div>
                  <ul className="flex flex-col gap-1">
                    {groupSets(lift.sets).map((line, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          {line.label ? <span className="text-muted">{line.label}</span> : null}
                          {line.isAmrap ? (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                              AMRAP
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono text-light">
                          {line.count > 1 ? `${line.count}x` : ""}
                          {line.reps} @ {kg(line.weightKg)} kg
                          {line.rpe != null ? ` @${line.rpe}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {hasAccessories ? (
            <div className={hasMain ? "border-t border-border pt-3" : ""}>
              <h4 className="mb-1.5 text-sm font-semibold">Accessories</h4>
              <ul className="flex flex-col gap-2">
                {accessories.map((acc, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{acc.name}</span>
                      {!acc.sameDay ? (
                        <span className="text-[11px] text-muted">
                          Day {acc.dayNumber}
                          {acc.dateCompleted ? ` - ${formatDate(acc.dateCompleted)}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right font-mono text-light">
                      {acc.sets
                        .map(
                          (s) =>
                            `${kg(s.weightKg ?? 0)}x${s.reps ?? "-"}${s.rpe != null ? `@${s.rpe}` : ""}`,
                        )
                        .join("  ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
