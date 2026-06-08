import { DEFAULT_PLATE_INCREMENT } from "./config";

/** Round a load to the nearest available plate increment (default 2.5 kg). */
export function roundToPlate(weightKg: number, incrementKg = DEFAULT_PLATE_INCREMENT): number {
  if (incrementKg <= 0) return Math.round(weightKg * 100) / 100;
  const rounded = Math.round(weightKg / incrementKg) * incrementKg;
  // Avoid binary float noise like 67.50000000001.
  return Math.round(rounded * 100) / 100;
}
