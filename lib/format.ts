/**
 * Parse an accessory scheme string into a default set count and target reps.
 * Handles "3x8", "3x10-12", "3x12-15", "3 sets". Falls back to 3 sets.
 */
export function parseScheme(scheme: string): { sets: number; reps: number | null } {
  const s = scheme.toLowerCase().trim();
  const cross = s.match(/(\d+)\s*x\s*(\d+)/); // "3x8" or "3x10-12" (first number after x)
  if (cross) {
    return { sets: Number(cross[1]), reps: Number(cross[2]) };
  }
  const setsOnly = s.match(/(\d+)\s*sets?/); // "3 sets"
  if (setsOnly) {
    return { sets: Number(setsOnly[1]), reps: null };
  }
  return { sets: 3, reps: null };
}

/** Format a kg weight without trailing zeros (e.g. 72.5, 150, 91.25). */
export function kg(weight: number | null | undefined): string {
  if (weight == null) return "-";
  const n = Math.round(weight * 100) / 100;
  return `${n}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
