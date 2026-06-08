import { REINTRO_WEEKS, TOTAL_DAYS, WAVE_WEEKS } from "./config";
import type { Phase } from "./types";

export interface Cursor {
  phase: Phase;
  weekIndex: number;
  dayNumber: number;
  cycleIndex: number;
}

/**
 * Sessions are a queue, not calendar-locked (PRD §9). Completing a day advances the cursor:
 * day 1->4, then the week rolls over. Reintro runs weeks 1..3 then transitions to the wave;
 * the wave cycles weeks 1..4 (week 4 = deload) and increments the cycle index.
 */
export function advanceCursor(c: Cursor): Cursor {
  if (c.dayNumber < TOTAL_DAYS) {
    return { ...c, dayNumber: c.dayNumber + 1 };
  }

  // Week complete: roll over to day 1 of the next week.
  if (c.phase === "reintro_linear") {
    if (c.weekIndex < REINTRO_WEEKS) {
      return { ...c, dayNumber: 1, weekIndex: c.weekIndex + 1 };
    }
    // Reintro finished -> begin the wave at week 1, cycle 1.
    return { phase: "wave", dayNumber: 1, weekIndex: 1, cycleIndex: 1 };
  }

  // Wave phase.
  if (c.weekIndex < WAVE_WEEKS) {
    return { ...c, dayNumber: 1, weekIndex: c.weekIndex + 1 };
  }
  // Cycle complete (after deload week 4) -> next cycle, week 1.
  return { ...c, dayNumber: 1, weekIndex: 1, cycleIndex: c.cycleIndex + 1 };
}

/** True when this day's heavy work is an AMRAP top set that can drive TM progression. */
export function isProgressionDay(phase: Phase, weekIndex: number, dayNumber: number): boolean {
  if (phase !== "wave") return false; // reintro has no AMRAPs
  if (weekIndex === WAVE_WEEKS) return false; // deload week
  return dayNumber === 1 || dayNumber === 3; // the two heavy days (bench / deadlift)
}
