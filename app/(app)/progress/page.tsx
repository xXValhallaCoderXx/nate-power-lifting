import { getAccessoryHistory, getAllLoggedSets, getAmrapHistory } from "@/lib/queries";
import { estimate1rm, type LiftName } from "@/lib/program";
import { PageHeader } from "@/components/ui";
import { ProgressView, type LiftProgress } from "@/components/progress/ProgressView";
import {
  AccessoryProgress,
  type AccessoryProgressEntry,
} from "@/components/progress/AccessoryProgress";
import type { LinePoint } from "@/components/charts/LineChartCard";
import type { BarPoint } from "@/components/charts/BarChartCard";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const LIFTS: LiftName[] = ["bench", "deadlift", "squat"];

/** ISO-ish week key (year + week number) for grouping tonnage. */
function weekStart(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function ProgressPage() {
  const [logged, amrap, accHistory] = await Promise.all([
    getAllLoggedSets(),
    getAmrapHistory(),
    getAccessoryHistory(),
  ]);

  const data: LiftProgress[] = LIFTS.map((lift) => {
    const liftLogs = logged.filter((l) => l.liftId === lift);

    // Best estimated 1RM per day.
    const bestByDay = new Map<string, number>();
    for (const l of liftLogs) {
      const key = new Date(l.loggedAt).toDateString();
      const e = estimate1rm(l.actualWeightKg, l.actualReps);
      if (!bestByDay.has(key) || e > bestByDay.get(key)!) bestByDay.set(key, e);
    }
    const e1rm: LinePoint[] = [...bestByDay.entries()].map(([day, value]) => ({
      label: formatDate(new Date(day)),
      value: Math.round(value * 10) / 10,
    }));

    // Weekly tonnage.
    const tonByWeek = new Map<number, number>();
    for (const l of liftLogs) {
      const ws = weekStart(new Date(l.loggedAt)).getTime();
      tonByWeek.set(ws, (tonByWeek.get(ws) ?? 0) + l.actualWeightKg * l.actualReps);
    }
    const tonnage: BarPoint[] = [...tonByWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ws, value]) => ({ label: formatDate(new Date(ws)), value: Math.round(value) }));

    // AMRAP reps over time.
    const amrapItems = amrap.filter((a) => a.liftId === lift);
    const amrapPts: LinePoint[] = amrapItems.map((a) => ({
      label: formatDate(new Date(a.at)),
      value: a.achievedReps,
    }));

    const bestE1rm = e1rm.length > 0 ? Math.max(...e1rm.map((p) => p.value)) : null;

    return { lift, e1rm, tonnage, amrap: amrapPts, bestE1rm };
  });

  // --- Accessories: aggregate logged sets by exercise name. ---
  const accByName = new Map<string, typeof accHistory>();
  for (const row of accHistory) {
    const arr = accByName.get(row.name) ?? [];
    arr.push(row);
    accByName.set(row.name, arr);
  }

  const accessories: AccessoryProgressEntry[] = [...accByName.entries()]
    .map(([name, rows]) => {
      const dateOf = (r: (typeof rows)[number]) =>
        new Date((r.completedAt ?? r.createdAt) as Date);

      const bestE1rmByDay = new Map<string, number>();
      const bestRepsByDay = new Map<string, number>();
      const tonByWeek = new Map<number, number>();
      let hasWeight = false;

      for (const r of rows) {
        const w = r.weightKg ?? 0;
        const reps = r.reps ?? 0;
        if (w > 0) hasWeight = true;
        const day = dateOf(r).toDateString();

        if (w > 0 && reps > 0) {
          const e = estimate1rm(w, reps);
          if (!bestE1rmByDay.has(day) || e > bestE1rmByDay.get(day)!) bestE1rmByDay.set(day, e);
        }
        if (reps > 0 && (!bestRepsByDay.has(day) || reps > bestRepsByDay.get(day)!)) {
          bestRepsByDay.set(day, reps);
        }
        const ws = weekStart(dateOf(r)).getTime();
        tonByWeek.set(ws, (tonByWeek.get(ws) ?? 0) + w * reps);
      }

      const e1rm: LinePoint[] = [...bestE1rmByDay.entries()].map(([d, v]) => ({
        label: formatDate(new Date(d)),
        value: Math.round(v * 10) / 10,
      }));
      const reps: LinePoint[] = [...bestRepsByDay.entries()].map(([d, v]) => ({
        label: formatDate(new Date(d)),
        value: v,
      }));
      const tonnage: BarPoint[] = [...tonByWeek.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ws, value]) => ({ label: formatDate(new Date(ws)), value: Math.round(value) }));

      const bestE1rm = e1rm.length > 0 ? Math.max(...e1rm.map((p) => p.value)) : null;
      const maxReps = reps.length > 0 ? Math.max(...reps.map((p) => p.value)) : null;

      return { name, e1rm, reps, tonnage, bestE1rm, maxReps, isBodyweight: !hasWeight };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="Progress" subtitle="Estimated 1RM, tonnage & AMRAPs" />
      <ProgressView data={data} />

      <div className="px-5 pb-2">
        <h2 className="mb-3 mt-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Accessories
        </h2>
        <AccessoryProgress data={accessories} />
      </div>
    </>
  );
}
