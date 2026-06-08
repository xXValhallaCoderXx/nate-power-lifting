"use client";

import { useState } from "react";
import { LineChartCard, type LinePoint } from "@/components/charts/LineChartCard";
import { BarChartCard, type BarPoint } from "@/components/charts/BarChartCard";
import { LIFT_NAMES, type LiftName } from "@/lib/program";

export interface LiftProgress {
  lift: LiftName;
  e1rm: LinePoint[];
  tonnage: BarPoint[];
  amrap: LinePoint[];
  bestE1rm: number | null;
}

export function ProgressView({ data }: { data: LiftProgress[] }) {
  const available = data.filter((d) => d.e1rm.length > 0 || d.tonnage.length > 0);
  const [active, setActive] = useState<LiftName>(available[0]?.lift ?? "bench");
  const current = data.find((d) => d.lift === active);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex gap-2">
        {data.map((d) => (
          <button
            key={d.lift}
            type="button"
            onClick={() => setActive(d.lift)}
            className={`flex-1 rounded-xl border px-2 py-2 text-sm font-semibold ${
              active === d.lift
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-surface2 text-muted"
            }`}
          >
            {LIFT_NAMES[d.lift].split(" ")[0]}
          </button>
        ))}
      </div>

      {current ? (
        <>
          {current.bestE1rm != null ? (
            <div className="card flex items-center justify-between">
              <span className="text-sm text-muted">Best estimated 1RM</span>
              <span className="text-2xl font-bold">{current.bestE1rm} kg</span>
            </div>
          ) : null}

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Estimated 1RM trend
            </h2>
            <LineChartCard data={current.e1rm} color="#f5a524" unit="kg" />
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Weekly tonnage
            </h2>
            <BarChartCard data={current.tonnage} color="#22c55e" unit="kg" />
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              AMRAP rep history
            </h2>
            <LineChartCard data={current.amrap} color="#ef4444" unit="reps" />
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-muted">No logged data yet.</p>
      )}
    </div>
  );
}
