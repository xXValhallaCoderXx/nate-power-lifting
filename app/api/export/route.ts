import { NextResponse, type NextRequest } from "next/server";
import {
  db,
  athlete,
  lift,
  trainingMaxEvent,
  programConfig,
  session,
  prescribedSet,
  loggedSet,
  accessoryItem,
  accessorySet,
} from "@/db";

export const dynamic = "force-dynamic";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10);

  const [athletes, lifts, tmEvents, configs, sessions, prescribed, logged, accessories, accSets] =
    await Promise.all([
      db.select().from(athlete),
      db.select().from(lift),
      db.select().from(trainingMaxEvent),
      db.select().from(programConfig),
      db.select().from(session),
      db.select().from(prescribedSet),
      db.select().from(loggedSet),
      db.select().from(accessoryItem),
      db.select().from(accessorySet),
    ]);

  if (format === "csv") {
    // The logged sets are the data worth keeping; join in the prescribed target.
    const byId = new Map(prescribed.map((p) => [p.id, p]));
    const sessById = new Map(sessions.map((s) => [s.id, s]));
    const rows = logged.map((l) => {
      const p = l.prescribedSetId != null ? byId.get(l.prescribedSetId) : undefined;
      const s = sessById.get(l.sessionId);
      return {
        loggedAt: l.loggedAt,
        sessionId: l.sessionId,
        day: s?.dayNumber ?? "",
        phase: s?.phase ?? "",
        weekIndex: s?.weekIndex ?? "",
        cycleIndex: s?.cycleIndex ?? "",
        lift: l.liftId,
        role: p?.role ?? "",
        label: p?.label ?? "",
        isAmrap: p?.isAmrap ?? "",
        targetWeightKg: p?.targetWeightKg ?? "",
        targetReps: p?.targetReps ?? "",
        actualWeightKg: l.actualWeightKg,
        actualReps: l.actualReps,
        actualRpe: l.actualRpe ?? "",
        notes: l.notes ?? "",
      };
    });
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lift-export-${stamp}.csv"`,
      },
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    athletes,
    lifts,
    trainingMaxEvents: tmEvents,
    programConfig: configs,
    sessions,
    prescribedSets: prescribed,
    loggedSets: logged,
    accessoryItems: accessories,
    accessorySets: accSets,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lift-export-${stamp}.json"`,
    },
  });
}
