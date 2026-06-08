"use client";

import { useState } from "react";
import { LineChartCard, type LinePoint } from "@/components/charts/LineChartCard";
import { BarChartCard, type BarPoint } from "@/components/charts/BarChartCard";

export interface AccessoryProgressEntry {
  name: string;
  e1rm: LinePoint[];
  reps: LinePoint[];
  tonnage: BarPoint[];
  bestE1rm: number | null;
  maxReps: number | null;
  isBodyweight: boolean;
}

export function AccessoryProgress({ data }: { data: AccessoryProgressEntry[] }) {
  const [active, setActive] = useState(data[0]?.name ?? "");
  const current = data.find((d) => d.name === active) ?? data[0];

  if (data.length === 0) {
    return (
      <p className="px-1 text-sm text-muted">No accessory work logged yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={current?.name}
        onChange={(e) => setActive(e.target.value)}
        className="input"
      >
        {data.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>

      {current ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="card text-center">
              <div className="text-xl font-bold">
                {current.isBodyweight
                  ? current.maxReps != null
                    ? `${current.maxReps}`
                    : "-"
                  : current.bestE1rm != null
                    ? `${current.bestE1rm} kg`
                    : "-"}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                {current.isBodyweight ? "Best set reps" : "Best est. 1RM"}
              </div>
            </div>
            <div className="card text-center">
              <div className="text-xl font-bold">
                {current.tonnage.reduce((s, p) => s + p.value, 0)} kg
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">Total tonnage</div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {current.isBodyweight ? "Reps trend" : "Estimated 1RM trend"}
            </h3>
            {current.isBodyweight ? (
              <LineChartCard data={current.reps} color="#f5a524" unit="reps" />
            ) : (
              <LineChartCard data={current.e1rm} color="#f5a524" unit="kg" />
            )}
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Weekly tonnage
            </h3>
            <BarChartCard data={current.tonnage} color="#22c55e" unit="kg" />
          </div>
        </>
      ) : null}
    </div>
  );
}
