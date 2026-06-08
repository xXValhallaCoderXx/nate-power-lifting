import { WEEKLY_TEMPLATE } from "./config";
import { generateSession } from "./generateSession";
import { reintroWeeklyBump } from "./progression";
import { advanceCursor, isProgressionDay, type Cursor } from "./queue";
import type { LiftName, PrescribedSet, TrainingMaxes } from "./types";

export interface PreviewUpcomingInput {
  /** Current queue position (from programConfig). */
  cursor: Cursor;
  /** Current Training Maxes. */
  tms: TrainingMaxes;
  /** Plate increment for rounding loads (kg). Defaults to 2.5. */
  plateIncrementKg?: number;
  /** How many upcoming sessions to simulate. */
  count: number;
}

/** One simulated upcoming session, derived purely from the queue (no DB state). */
export interface UpcomingSession {
  /** The queue position this session occupies. */
  cursor: Cursor;
  /** Template day name, e.g. "Bench Heavy + DL Volume". */
  templateName: string;
  /** Generated prescribed work for this session (empty if uncalibrated/rest). */
  sets: PrescribedSet[];
  /** Week 4 wave deload. */
  isDeload: boolean;
  /** Heavy AMRAP day that can drive TM progression. */
  isProgressionDay: boolean;
  /** True when this session begins a new week relative to the previous one. */
  weekRollover: boolean;
  /** True once loads are based on projected (not yet earned) TMs. */
  tmsProjected: boolean;
}

/**
 * Simulate the next `count` queued sessions from the current cursor. Pure: no DB/React.
 *
 * The program is a queue, not calendar-locked (PRD §9), and both `advanceCursor` and
 * `generateSession` are pure, so the upcoming plan is fully derivable in memory.
 *
 * TM projection honesty:
 *  - Reintro phase: weekly bumps are deterministic, so this mirrors `completeSession` and
 *    applies `reintroWeeklyBump` on each week rollover (marking later sessions as projected).
 *  - Wave phase: AMRAP-driven TM changes depend on performance and cannot be predicted, so
 *    the current TM is carried forward unchanged (real loads may end up higher).
 */
export function previewUpcoming(input: PreviewUpcomingInput): UpcomingSession[] {
  const { cursor, tms, plateIncrementKg, count } = input;

  const out: UpcomingSession[] = [];
  let current: Cursor = { ...cursor };
  let projectedTms: TrainingMaxes = { ...tms };
  let tmsProjected = false;

  for (let i = 0; i < count; i++) {
    const template = WEEKLY_TEMPLATE[current.dayNumber];
    const sets = generateSession({
      tms: projectedTms,
      phase: current.phase,
      weekIndex: current.weekIndex,
      dayNumber: current.dayNumber,
      plateIncrementKg,
    });

    out.push({
      cursor: { ...current },
      templateName: template?.name ?? "Rest",
      sets,
      isDeload: current.phase === "wave" && current.weekIndex === 4,
      isProgressionDay: isProgressionDay(current.phase, current.weekIndex, current.dayNumber),
      weekRollover: i === 0 ? false : out[i - 1].cursor.weekIndex !== current.weekIndex,
      tmsProjected,
    });

    const nextCursor = advanceCursor(current);

    // Mirror completeSession: a reintro week rollover applies the deterministic linear bump.
    const rolledWeekInReintro =
      current.phase === "reintro_linear" &&
      nextCursor.phase === "reintro_linear" &&
      nextCursor.weekIndex > current.weekIndex;

    if (rolledWeekInReintro) {
      const bumped: TrainingMaxes = { ...projectedTms };
      for (const key of Object.keys(bumped) as LiftName[]) {
        const tm = bumped[key];
        if (tm == null) continue;
        bumped[key] = reintroWeeklyBump(key, tm).newTm;
      }
      projectedTms = bumped;
      tmsProjected = true;
    }

    current = nextCursor;
  }

  return out;
}
