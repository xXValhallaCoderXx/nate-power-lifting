import "server-only";
import { and, asc, desc, eq, ilike, inArray, lt, or } from "drizzle-orm";
import {
  db,
  athlete,
  lift,
  programConfig,
  session,
  prescribedSet,
  loggedSet,
  accessoryItem,
  accessorySet,
  trainingMaxEvent,
  exercise,
} from "@/db";
import type { LiftName, Role, TrainingMaxes } from "@/lib/program";

export async function getAthlete() {
  const rows = await db.select().from(athlete).orderBy(asc(athlete.id)).limit(1);
  return rows[0] ?? null;
}

export async function getLifts() {
  return db.select().from(lift).orderBy(asc(lift.id));
}

export async function getProgramConfig() {
  const rows = await db.select().from(programConfig).orderBy(asc(programConfig.id)).limit(1);
  return rows[0] ?? null;
}

export async function getTrainingMaxes(): Promise<TrainingMaxes> {
  const lifts = await getLifts();
  const tms: TrainingMaxes = {};
  for (const l of lifts) {
    tms[l.id as LiftName] = l.trainingMaxKg;
  }
  return tms;
}

/** The current in-progress session, if any. */
export async function getActiveSession() {
  const rows = await db
    .select()
    .from(session)
    .where(eq(session.status, "in_progress"))
    .orderBy(desc(session.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSessionById(id: number) {
  const rows = await db.select().from(session).where(eq(session.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPrescribedSets(sessionId: number) {
  return db
    .select()
    .from(prescribedSet)
    .where(eq(prescribedSet.sessionId, sessionId))
    .orderBy(asc(prescribedSet.orderIndex));
}

export async function getLoggedSets(sessionId: number) {
  return db
    .select()
    .from(loggedSet)
    .where(eq(loggedSet.sessionId, sessionId))
    .orderBy(asc(loggedSet.id));
}

export async function getAccessories(sessionId: number) {
  return db
    .select()
    .from(accessoryItem)
    .where(eq(accessoryItem.sessionId, sessionId))
    .orderBy(asc(accessoryItem.orderIndex));
}

export async function getAccessorySets(sessionId: number) {
  return db
    .select()
    .from(accessorySet)
    .where(eq(accessorySet.sessionId, sessionId))
    .orderBy(asc(accessorySet.orderIndex));
}

/** All logged accessory sets across sessions, keyed by exercise name (for progress charts). */
export async function getAccessoryHistory() {
  return db
    .select({
      name: accessoryItem.name,
      weightKg: accessorySet.weightKg,
      reps: accessorySet.reps,
      rpe: accessorySet.rpe,
      completedAt: session.dateCompleted,
      createdAt: session.createdAt,
    })
    .from(accessorySet)
    .innerJoin(accessoryItem, eq(accessorySet.accessoryItemId, accessoryItem.id))
    .innerJoin(session, eq(accessorySet.sessionId, session.id))
    .orderBy(asc(session.createdAt));
}

export async function getTmEvents(liftId?: LiftName) {
  const base = db.select().from(trainingMaxEvent);
  const rows = liftId
    ? await base.where(eq(trainingMaxEvent.liftId, liftId)).orderBy(asc(trainingMaxEvent.at))
    : await base.orderBy(asc(trainingMaxEvent.at));
  return rows;
}

/** All logged sets for a lift across all sessions (for progress charts). */
export async function getLoggedSetsForLift(liftId: LiftName) {
  return db
    .select()
    .from(loggedSet)
    .where(eq(loggedSet.liftId, liftId))
    .orderBy(asc(loggedSet.loggedAt));
}

export async function getCompletedSessions() {
  return db
    .select()
    .from(session)
    .where(eq(session.status, "completed"))
    .orderBy(desc(session.dateCompleted));
}

/** Search the bundled exercise catalog by name or equipment. */
export async function searchExercises(query: string, limit = 30) {
  const q = query.trim();
  if (!q) {
    return db.select().from(exercise).orderBy(asc(exercise.name)).limit(limit);
  }
  const pattern = `%${q}%`;
  return db
    .select()
    .from(exercise)
    .where(or(ilike(exercise.name, pattern), ilike(exercise.equipment, pattern)))
    .orderBy(asc(exercise.name))
    .limit(limit);
}

export async function getAllLoggedSets() {
  return db.select().from(loggedSet).orderBy(asc(loggedSet.loggedAt));
}

/** All AMRAP logged sets across every session (for the rep-history chart). */
export async function getAmrapHistory() {
  return db
    .select({
      liftId: prescribedSet.liftId,
      targetReps: prescribedSet.targetReps,
      achievedReps: loggedSet.actualReps,
      weight: loggedSet.actualWeightKg,
      at: loggedSet.loggedAt,
    })
    .from(loggedSet)
    .innerJoin(prescribedSet, eq(loggedSet.prescribedSetId, prescribedSet.id))
    .where(eq(prescribedSet.isAmrap, true))
    .orderBy(asc(loggedSet.loggedAt));
}

/** A read-only "last time" snapshot of main-lift work from the most recent same-day session. */
export interface PreviousSessionSnapshot {
  sessionId: number;
  dayNumber: number;
  phase: string;
  weekIndex: number;
  cycleIndex: number;
  dateCompleted: Date | null;
  mainLifts: {
    liftId: LiftName;
    role: Role;
    sets: { label: string | null; weightKg: number; reps: number; rpe: number | null; isAmrap: boolean }[];
  }[];
}

/**
 * "Last time" comparison for the main lifts: the most recent COMPLETED session sharing this
 * session's template day AND phase (so rep schemes line up). Returns a read-only snapshot of
 * what was actually logged, or null if there's no prior matching session.
 *
 * Anchoring on dayNumber + phase keeps the comparison apples-to-apples: a given template day
 * always has the same main-lift roles (lib/program/config.ts), and phase distinguishes reintro
 * from wave. Accessories are handled separately (getAccessoryLastTimes) because they can be
 * swapped. We exclude warm-ups to keep the snapshot focused.
 */
export async function getPreviousSameDaySnapshot(current: {
  id: number;
  dayNumber: number;
  phase: string;
  createdAt: Date;
}): Promise<PreviousSessionSnapshot | null> {
  const prevRows = await db
    .select()
    .from(session)
    .where(
      and(
        eq(session.status, "completed"),
        eq(session.dayNumber, current.dayNumber),
        eq(session.phase, current.phase),
        lt(session.createdAt, current.createdAt),
      ),
    )
    .orderBy(desc(session.createdAt))
    .limit(1);

  const prev = prevRows[0];
  if (!prev) return null;

  const mainRows = await db
    .select({ logged: loggedSet, prescribed: prescribedSet })
    .from(loggedSet)
    .leftJoin(prescribedSet, eq(loggedSet.prescribedSetId, prescribedSet.id))
    .where(eq(loggedSet.sessionId, prev.id))
    .orderBy(asc(loggedSet.id));

  // Group main-lift logged sets by lift (skip warm-ups), preserving log order.
  const liftOrder: LiftName[] = [];
  const byLift = new Map<LiftName, PreviousSessionSnapshot["mainLifts"][number]>();
  for (const row of mainRows) {
    if (row.prescribed?.isWarmup) continue;
    const liftId = row.logged.liftId as LiftName;
    let group = byLift.get(liftId);
    if (!group) {
      group = { liftId, role: (row.prescribed?.role as Role) ?? "medium", sets: [] };
      byLift.set(liftId, group);
      liftOrder.push(liftId);
    }
    group.sets.push({
      label: row.prescribed?.label ?? null,
      weightKg: row.logged.actualWeightKg,
      reps: row.logged.actualReps,
      rpe: row.logged.actualRpe,
      isAmrap: row.prescribed?.isAmrap ?? false,
    });
  }

  return {
    sessionId: prev.id,
    dayNumber: prev.dayNumber,
    phase: prev.phase,
    weekIndex: prev.weekIndex,
    cycleIndex: prev.cycleIndex,
    dateCompleted: prev.dateCompleted,
    mainLifts: liftOrder.map((id) => byLift.get(id)!),
  };
}

/** The most recent prior logging of a single accessory exercise. */
export interface AccessoryLastTime {
  name: string;
  dateCompleted: Date | null;
  /** The day number that occurrence belonged to. */
  dayNumber: number;
  /** True when the match came from the same template day (consistent rep scheme). */
  sameDay: boolean;
  sets: { weightKg: number | null; reps: number | null; rpe: number | null }[];
}

/**
 * Per-accessory "last time": for each given accessory name, the most recent COMPLETED logging
 * before this session. Prefers an occurrence on the SAME template day (so the rep scheme lines
 * up); only when an accessory was never done on this day (e.g. a swapped-in exercise) does it
 * fall back to the most recent occurrence on any day, flagged via `sameDay: false` so the UI can
 * label the different context. Keyed by accessory name; names with no history are omitted.
 */
export async function getAccessoryLastTimes(
  current: { dayNumber: number; createdAt: Date },
  names: string[],
): Promise<Record<string, AccessoryLastTime>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  const rows = await db
    .select({
      name: accessoryItem.name,
      itemId: accessoryItem.id,
      dayNumber: session.dayNumber,
      dateCompleted: session.dateCompleted,
      weightKg: accessorySet.weightKg,
      reps: accessorySet.reps,
      rpe: accessorySet.rpe,
    })
    .from(accessorySet)
    .innerJoin(accessoryItem, eq(accessorySet.accessoryItemId, accessoryItem.id))
    .innerJoin(session, eq(accessorySet.sessionId, session.id))
    .where(
      and(
        eq(session.status, "completed"),
        lt(session.createdAt, current.createdAt),
        inArray(accessoryItem.name, unique),
      ),
    )
    .orderBy(desc(session.createdAt), asc(accessorySet.orderIndex));

  // Per name, collect each occurrence (one accessory item) in most-recent-first order.
  type Occurrence = { dayNumber: number; dateCompleted: Date | null; sets: AccessoryLastTime["sets"] };
  const occurrencesByName = new Map<string, Map<number, Occurrence>>();
  const itemOrderByName = new Map<string, number[]>();
  for (const row of rows) {
    let items = occurrencesByName.get(row.name);
    if (!items) {
      items = new Map();
      occurrencesByName.set(row.name, items);
      itemOrderByName.set(row.name, []);
    }
    let occ = items.get(row.itemId);
    if (!occ) {
      occ = { dayNumber: row.dayNumber, dateCompleted: row.dateCompleted, sets: [] };
      items.set(row.itemId, occ);
      itemOrderByName.get(row.name)!.push(row.itemId);
    }
    occ.sets.push({ weightKg: row.weightKg, reps: row.reps, rpe: row.rpe });
  }

  const result: Record<string, AccessoryLastTime> = {};
  for (const [name, items] of occurrencesByName) {
    const order = itemOrderByName.get(name)!; // most recent first
    const sameDayId = order.find((id) => items.get(id)!.dayNumber === current.dayNumber);
    const chosenId = sameDayId ?? order[0];
    const occ = items.get(chosenId)!;
    result[name] = {
      name,
      dateCompleted: occ.dateCompleted,
      dayNumber: occ.dayNumber,
      sameDay: sameDayId != null,
      sets: occ.sets,
    };
  }
  return result;
}

/** Heavy AMRAP logged sets (joined with their prescription) to detect TM-progression. */
export async function getAmrapLogs(sessionId: number) {
  return db
    .select({
      logged: loggedSet,
      prescribed: prescribedSet,
    })
    .from(loggedSet)
    .innerJoin(prescribedSet, eq(loggedSet.prescribedSetId, prescribedSet.id))
    .where(and(eq(loggedSet.sessionId, sessionId), eq(prescribedSet.isAmrap, true)));
}
