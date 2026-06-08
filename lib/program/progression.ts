import { BEAT_MARGIN, REINTRO_WEEKLY_TM_BUMP, TM_DELTAS } from "./config";
import type { AmrapResult, LiftName, TmProposal } from "./types";

/**
 * The TM is a precise number, not a loaded bar, so it is NOT rounded to the plate increment
 * (plate rounding applies only to prescribed working loads). This preserves the bench +1.25 kg
 * small bump even when the plate increment is 2.5 kg.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The core mechanic (PROGRAM.md §7). Given a heavy-day AMRAP result, propose the next TM:
 *  - Beat the rep floor by >= 2  -> bump TM (+2.5 bench, +5 squat/DL)
 *  - Just hit the floor          -> small bump (+1.25 bench, +2.5 squat/DL)
 *  - Miss                        -> hold (run the cycle back)
 *
 * Always returns a proposal (the caller writes a TrainingMaxEvent on accept) and is always
 * user-overridable.
 */
export function proposeTmChange(input: AmrapResult): TmProposal {
  const { lift, currentTm, targetReps, achievedReps, plateIncrementKg } = input;
  const deltas = TM_DELTAS[lift];
  const over = achievedReps - targetReps;

  let deltaKg = 0;
  let reason: TmProposal["reason"] = "amrap_miss";
  let message = "";

  if (over >= BEAT_MARGIN) {
    deltaKg = deltas.beat;
    reason = "amrap_beat";
    message = `Beat target by ${over} reps - bump TM +${deltaKg} kg.`;
  } else if (over >= 0) {
    deltaKg = deltas.hit;
    reason = "amrap_hit";
    message = `Hit the target - small bump +${deltaKg} kg.`;
  } else {
    deltaKg = 0;
    reason = "amrap_miss";
    message = `Missed target by ${-over} ${-over === 1 ? "rep" : "reps"} - hold TM, repeat the cycle.`;
  }

  const newTm = round2(currentTm + deltaKg);
  return {
    lift,
    oldTm: currentTm,
    newTm,
    deltaKg: round2(newTm - currentTm),
    reason,
    message,
  };
}

/** Phase 0 weekly linear bump (PROGRAM.md §7): applied automatically each reintro week. */
export function reintroWeeklyBump(lift: LiftName, currentTm: number): TmProposal {
  const deltaKg = REINTRO_WEEKLY_TM_BUMP[lift];
  const newTm = round2(currentTm + deltaKg);
  return {
    lift,
    oldTm: currentTm,
    newTm,
    deltaKg,
    reason: "phase0_linear",
    message: `Reintro linear progression: +${deltaKg} kg.`,
  };
}
