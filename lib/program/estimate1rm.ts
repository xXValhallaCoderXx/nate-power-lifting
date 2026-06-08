/**
 * Estimated 1RM formulas (PRD §6). Used only for trend charts, never for TM logic.
 * Lower-rep sets give higher-confidence estimates.
 */

export function epley(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function brzycki(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  const denom = 1.0278 - 0.0278 * reps;
  if (denom <= 0) return weightKg; // formula breaks down past ~36 reps
  return weightKg / denom;
}

/** Best (higher) single-set estimate, rounded to 1 decimal. */
export function estimate1rm(weightKg: number, reps: number): number {
  const e = Math.max(epley(weightKg, reps), brzycki(weightKg, reps));
  return Math.round(e * 10) / 10;
}

/** Confidence drops as reps rise; expose it so the UI can de-emphasize high-rep estimates. */
export function estimateConfidence(reps: number): "high" | "medium" | "low" {
  if (reps <= 5) return "high";
  if (reps <= 10) return "medium";
  return "low";
}
