/**
 * Domain types for the progression engine.
 *
 * This module is intentionally free of any DB or React imports. The rest of the app maps
 * its rows onto these types and calls the pure functions in this folder. To change the
 * training methodology, change only `lib/program/*`.
 */

export type LiftName = "bench" | "deadlift" | "squat";

export type Role = "heavy" | "medium" | "light";

export type Phase = "reintro_linear" | "wave";

/** Current Training Max per lift, in kg. `null` means not yet calibrated (e.g. squat). */
export type TrainingMaxes = Partial<Record<LiftName, number | null>>;

/** A single set the engine prescribes for a session. (Not a DB row.) */
export interface PrescribedSet {
  liftId: LiftName;
  role: Role;
  orderIndex: number;
  /** Human label: "Warm-up" | "Top set" | "Back-off" | "Volume" | "Speed". */
  label: string;
  targetWeightKg: number;
  targetReps: number;
  isAmrap: boolean;
  isBackoff: boolean;
  isWarmup: boolean;
  targetRpe: number | null;
}

export interface GenerateSessionInput {
  tms: TrainingMaxes;
  phase: Phase;
  /** 1..4 (wave) or 1..3 (reintro). */
  weekIndex: number;
  /** Which template day to generate, 1..4. */
  dayNumber: number;
  /** Plate increment for rounding loads (kg). Defaults to 2.5. */
  plateIncrementKg?: number;
}

/** Result of a heavy-day AMRAP top set, fed to the progression engine. */
export interface AmrapResult {
  lift: LiftName;
  currentTm: number;
  /** Rep target prescribed for the AMRAP (e.g. 5 in "5+"). */
  targetReps: number;
  /** Reps actually achieved on the AMRAP. */
  achievedReps: number;
  plateIncrementKg?: number;
}

export type TmChangeReason = "amrap_beat" | "amrap_hit" | "amrap_miss" | "manual" | "phase0_linear";

/** A proposed Training Max change the user can Accept / Edit / Decline. */
export interface TmProposal {
  lift: LiftName;
  oldTm: number;
  newTm: number;
  deltaKg: number;
  reason: TmChangeReason;
  /** Short human explanation shown in the UI. */
  message: string;
}

export interface AccessoryDef {
  name: string;
  scheme: string;
}
