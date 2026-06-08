import type { AccessoryDef, LiftName, Phase, Role } from "./types";

/**
 * All program-specific numbers from PROGRAM.md live here. Changing the methodology should
 * mostly mean editing this file.
 */

export const LIFT_NAMES: Record<LiftName, string> = {
  bench: "Bench Press",
  deadlift: "Deadlift",
  squat: "Squat",
};

export const ROLE_LABELS: Record<Role, string> = {
  heavy: "Heavy",
  medium: "Medium / Volume",
  light: "Light / Speed",
};

/** Default plate increment (kg). Settings can switch to 1.25. */
export const DEFAULT_PLATE_INCREMENT = 2.5;

/** Standard barbell weight (kg) used for warm-up ramps. */
export const BAR_WEIGHT_KG = 20;

/**
 * Weekly template (PROGRAM.md §5). Each day lists its main lifts and the role each plays.
 * This yields Bench 3x (heavy/medium/light), Deadlift 3x (medium/heavy/light), Squat 1x.
 */
export interface TemplateSlot {
  lift: LiftName;
  role: Role;
  /** For deadlift light day, the work is a variation (deficit / paused / RDL / tempo). */
  isVariation?: boolean;
}

export const WEEKLY_TEMPLATE: Record<number, { name: string; slots: TemplateSlot[] }> = {
  1: {
    name: "Bench Heavy + DL Volume",
    slots: [
      { lift: "bench", role: "heavy" },
      { lift: "deadlift", role: "medium" },
    ],
  },
  2: {
    name: "Squat + Bench Volume",
    slots: [
      { lift: "squat", role: "medium" },
      { lift: "bench", role: "medium" },
    ],
  },
  3: {
    name: "DL Heavy + Speed Bench",
    slots: [
      { lift: "deadlift", role: "heavy" },
      { lift: "bench", role: "light" },
    ],
  },
  4: {
    name: "DL Speed/Variation",
    slots: [{ lift: "deadlift", role: "light", isVariation: true }],
  },
};

export const TOTAL_DAYS = 4;

/**
 * Role percentages of Training Max (PROGRAM.md §6). Heavy varies by phase/week (see below);
 * medium and light are stable. Medium = 0.73 makes DL 205 -> 150 kg, matching the §9 example.
 */
export const ROLE_PCT: Record<"medium" | "light", number> = {
  medium: 0.73, // 70-75% band
  light: 0.675, // 65-70% band
};

export const ROLE_SETS: Record<"medium" | "light", { sets: number; reps: number; rpe: number }> = {
  medium: { sets: 4, reps: 5, rpe: 7 },
  light: { sets: 6, reps: 3, rpe: 6 },
};

/** Back-off sets after a heavy top set: -12% of the top-set load, same reps (PROGRAM.md §6). */
export const BACKOFF_PCT_OF_TOP = 0.88;
export const BACKOFF_SETS = 3;

/**
 * Phase 1+ wave (PROGRAM.md §7). Heavy-day top set percentage of TM + AMRAP rep floor.
 * Week 4 is a deload: low volume, no AMRAP.
 */
export interface WaveWeek {
  topSetPct: number;
  /** Minimum rep target for the AMRAP top set (the "5+", "4+", "3+"). */
  amrapMinReps: number;
  topSetRpe: number;
  isDeload: boolean;
}

export const WAVE: Record<number, WaveWeek> = {
  1: { topSetPct: 0.8, amrapMinReps: 5, topSetRpe: 8, isDeload: false },
  2: { topSetPct: 0.825, amrapMinReps: 4, topSetRpe: 8.5, isDeload: false },
  3: { topSetPct: 0.85, amrapMinReps: 3, topSetRpe: 9, isDeload: false },
  4: { topSetPct: 0.65, amrapMinReps: 0, topSetRpe: 6, isDeload: true },
};

export const WAVE_WEEKS = 4;
export const REINTRO_WEEKS = 3;

/**
 * Phase 0 reintroduction heavy top set (PROGRAM.md §7): a clean top set with ~2 reps in
 * reserve, NO AMRAP. Conservative percentage; tissue tolerance over PRs.
 */
export const REINTRO_HEAVY = { topSetPct: 0.82, reps: 5, rpe: 7 };

/** TM auto-progression deltas by lift (PROGRAM.md §7). */
export const TM_DELTAS: Record<LiftName, { beat: number; hit: number }> = {
  bench: { beat: 2.5, hit: 1.25 },
  deadlift: { beat: 5, hit: 2.5 },
  squat: { beat: 5, hit: 2.5 },
};

/** Phase 0 linear weekly TM bump (PROGRAM.md §7). */
export const REINTRO_WEEKLY_TM_BUMP: Record<LiftName, number> = {
  bench: 2.5,
  deadlift: 5,
  squat: 5,
};

/** "Beat the target" means achieving at least this many reps over the floor (PROGRAM.md §7). */
export const BEAT_MARGIN = 2;

/** Warm-up ramp toward the top working weight: fractions of the top set, descending reps. */
export const WARMUP_RAMP: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 5 },
  { pct: 0.75, reps: 3 },
  { pct: 0.85, reps: 2 },
];

/** Display-only accessory checklists per day (PROGRAM.md §6). */
export const ACCESSORIES: Record<number, AccessoryDef[]> = {
  1: [
    { name: "Close-Grip Bench", scheme: "3x8" },
    { name: "Chest-Supported Row", scheme: "3x10-12" },
    { name: "Overhead Triceps Ext", scheme: "3x12-15" },
    { name: "Rear Delts", scheme: "3x15" },
    { name: "Hanging Leg Raise", scheme: "3x10-15" },
  ],
  2: [
    { name: "Lat Pulldown", scheme: "3x10" },
    { name: "Incline DB Press", scheme: "3x10" },
    { name: "Leg Curl", scheme: "3x12" },
    { name: "Cable Triceps", scheme: "3x15" },
    { name: "Ab Wheel", scheme: "3 sets" },
  ],
  3: [
    { name: "Barbell Row", scheme: "3x8" },
    { name: "Back Extension (light)", scheme: "3x12" },
    { name: "Pull-up", scheme: "3x10" },
    { name: "EZ-Bar Curl + Rear Delt superset", scheme: "3x12" },
    { name: "Cable Crunch", scheme: "3x15" },
  ],
  4: [
    { name: "Paused Bench", scheme: "3x8" },
    { name: "Seated DB Shoulder Press", scheme: "3x10" },
    { name: "Chest-Supported Row", scheme: "3x12" },
    { name: "Triceps + Biceps superset", scheme: "3x12" },
    { name: "Suitcase Carry", scheme: "3 sets" },
  ],
};

export function phaseLabel(phase: Phase): string {
  return phase === "reintro_linear" ? "Reintro (linear)" : "Wave";
}
