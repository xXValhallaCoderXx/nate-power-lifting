import {
  BACKOFF_PCT_OF_TOP,
  BACKOFF_SETS,
  REINTRO_HEAVY,
  ROLE_PCT,
  ROLE_SETS,
  WARMUP_RAMP,
  WAVE,
  WEEKLY_TEMPLATE,
} from "./config";
import { roundToPlate } from "./rounding";
import type { GenerateSessionInput, LiftName, PrescribedSet, Role } from "./types";

/**
 * Pure function: given current TMs, the phase, the week and the day number, produce the
 * ordered list of prescribed sets. Lifts without a TM (e.g. an uncalibrated squat) are
 * skipped — the UI prompts to calibrate them.
 */
export function generateSession(input: GenerateSessionInput): PrescribedSet[] {
  const { tms, phase, weekIndex, dayNumber, plateIncrementKg } = input;
  const template = WEEKLY_TEMPLATE[dayNumber];
  if (!template) return [];

  const sets: PrescribedSet[] = [];
  let order = 0;
  const next = () => order++;

  for (const slot of template.slots) {
    const tm = tms[slot.lift];
    if (tm == null || tm <= 0) continue; // not calibrated yet

    const round = (w: number) => roundToPlate(w, plateIncrementKg);

    if (slot.role === "heavy") {
      sets.push(
        ...buildHeavy({ lift: slot.lift, tm, phase, weekIndex, round, next }),
      );
    } else {
      sets.push(
        ...buildVolumeOrSpeed({ lift: slot.lift, role: slot.role, tm, round, next }),
      );
    }
  }

  return sets;
}

function makeWarmups(
  lift: LiftName,
  role: Role,
  topWeight: number,
  round: (w: number) => number,
  next: () => number,
): PrescribedSet[] {
  return WARMUP_RAMP.map((w) => ({
    liftId: lift,
    role,
    orderIndex: next(),
    label: "Warm-up",
    targetWeightKg: round(topWeight * w.pct),
    targetReps: w.reps,
    isAmrap: false,
    isBackoff: false,
    isWarmup: true,
    targetRpe: null,
  }));
}

function buildHeavy(args: {
  lift: LiftName;
  tm: number;
  phase: GenerateSessionInput["phase"];
  weekIndex: number;
  round: (w: number) => number;
  next: () => number;
}): PrescribedSet[] {
  const { lift, tm, phase, weekIndex, round, next } = args;
  const out: PrescribedSet[] = [];

  if (phase === "wave") {
    const wave = WAVE[weekIndex] ?? WAVE[1];
    const topWeight = round(tm * wave.topSetPct);

    out.push(...makeWarmups(lift, "heavy", topWeight, round, next));

    if (wave.isDeload) {
      // Deload: low volume, no AMRAP.
      for (let i = 0; i < 2; i++) {
        out.push({
          liftId: lift,
          role: "heavy",
          orderIndex: next(),
          label: "Deload",
          targetWeightKg: topWeight,
          targetReps: 3,
          isAmrap: false,
          isBackoff: false,
          isWarmup: false,
          targetRpe: wave.topSetRpe,
        });
      }
      return out;
    }

    out.push({
      liftId: lift,
      role: "heavy",
      orderIndex: next(),
      label: "Top set (AMRAP)",
      targetWeightKg: topWeight,
      targetReps: wave.amrapMinReps,
      isAmrap: true,
      isBackoff: false,
      isWarmup: false,
      targetRpe: wave.topSetRpe,
    });

    const backoffWeight = round(topWeight * BACKOFF_PCT_OF_TOP);
    for (let i = 0; i < BACKOFF_SETS; i++) {
      out.push({
        liftId: lift,
        role: "heavy",
        orderIndex: next(),
        label: "Back-off",
        targetWeightKg: backoffWeight,
        targetReps: wave.amrapMinReps,
        isAmrap: false,
        isBackoff: true,
        isWarmup: false,
        targetRpe: wave.topSetRpe - 1,
      });
    }
    return out;
  }

  // Phase 0 reintro: clean top set, ~2 reps in reserve, NO AMRAP.
  const topWeight = round(tm * REINTRO_HEAVY.topSetPct);
  out.push(...makeWarmups(lift, "heavy", topWeight, round, next));
  out.push({
    liftId: lift,
    role: "heavy",
    orderIndex: next(),
    label: "Top set",
    targetWeightKg: topWeight,
    targetReps: REINTRO_HEAVY.reps,
    isAmrap: false,
    isBackoff: false,
    isWarmup: false,
    targetRpe: REINTRO_HEAVY.rpe,
  });
  const backoffWeight = round(topWeight * BACKOFF_PCT_OF_TOP);
  for (let i = 0; i < BACKOFF_SETS; i++) {
    out.push({
      liftId: lift,
      role: "heavy",
      orderIndex: next(),
      label: "Back-off",
      targetWeightKg: backoffWeight,
      targetReps: REINTRO_HEAVY.reps,
      isAmrap: false,
      isBackoff: true,
      isWarmup: false,
      targetRpe: REINTRO_HEAVY.rpe,
    });
  }
  return out;
}

function buildVolumeOrSpeed(args: {
  lift: LiftName;
  role: "medium" | "light";
  tm: number;
  round: (w: number) => number;
  next: () => number;
}): PrescribedSet[] {
  const { lift, role, tm, round, next } = args;
  const weight = round(tm * ROLE_PCT[role]);
  const scheme = ROLE_SETS[role];
  const label = role === "medium" ? "Volume" : "Speed";

  const out: PrescribedSet[] = [];
  for (let i = 0; i < scheme.sets; i++) {
    out.push({
      liftId: lift,
      role,
      orderIndex: next(),
      label,
      targetWeightKg: weight,
      targetReps: scheme.reps,
      isAmrap: false,
      isBackoff: false,
      isWarmup: false,
      targetRpe: scheme.rpe,
    });
  }
  return out;
}
