import { describe, it, expect } from "vitest";
import { generateSession } from "../generateSession";
import { proposeTmChange, reintroWeeklyBump } from "../progression";
import { estimate1rm, epley, brzycki } from "../estimate1rm";
import { roundToPlate } from "../rounding";
import { advanceCursor, isProgressionDay } from "../queue";
import { previewUpcoming } from "../preview";
import { BACKOFF_PCT_OF_TOP } from "../config";
import type { TrainingMaxes } from "../types";

const TMS: TrainingMaxes = { bench: 90, deadlift: 205 };

describe("rounding", () => {
  it("rounds to the nearest 2.5 kg by default", () => {
    expect(roundToPlate(149.65)).toBe(150);
    expect(roundToPlate(73.8)).toBe(75); // 73.8 is closer to 75 than 72.5
    expect(roundToPlate(72)).toBe(72.5);
    expect(roundToPlate(76.5)).toBe(77.5);
  });

  it("supports a 1.25 kg increment", () => {
    expect(roundToPlate(73.8, 1.25)).toBe(73.75);
  });
});

describe("generateSession - Day 1 (Bench heavy + DL volume), reintro", () => {
  const sets = generateSession({
    tms: TMS,
    phase: "reintro_linear",
    weekIndex: 1,
    dayNumber: 1,
  });

  it("prescribes deadlift volume of 4x5 at 150 kg (matches PROGRAM.md §9)", () => {
    const dl = sets.filter((s) => s.liftId === "deadlift" && !s.isWarmup);
    expect(dl).toHaveLength(4);
    for (const s of dl) {
      expect(s.targetWeightKg).toBe(150);
      expect(s.targetReps).toBe(5);
      expect(s.isAmrap).toBe(false);
    }
  });

  it("has no AMRAP sets in the reintro phase", () => {
    expect(sets.some((s) => s.isAmrap)).toBe(false);
  });

  it("prescribes bench back-offs at -12% of the top set (PROGRAM.md §6)", () => {
    const top = sets.find((s) => s.liftId === "bench" && s.label === "Top set");
    const backoffs = sets.filter((s) => s.liftId === "bench" && s.isBackoff);
    expect(top).toBeDefined();
    expect(backoffs.length).toBe(3);
    expect(backoffs[0].targetWeightKg).toBe(roundToPlate(top!.targetWeightKg * BACKOFF_PCT_OF_TOP));
  });

  it("includes a warm-up ramp for the heavy lift", () => {
    const warmups = sets.filter((s) => s.liftId === "bench" && s.isWarmup);
    expect(warmups.length).toBeGreaterThan(0);
  });
});

describe("generateSession - wave week percentages (PROGRAM.md §7)", () => {
  it("week 1 heavy bench top set is an 80% TM, 5+ AMRAP", () => {
    const sets = generateSession({ tms: TMS, phase: "wave", weekIndex: 1, dayNumber: 1 });
    const top = sets.find((s) => s.isAmrap);
    expect(top?.targetWeightKg).toBe(roundToPlate(90 * 0.8)); // 72.5
    expect(top?.targetReps).toBe(5);
  });

  it("week 3 heavy deadlift top set is an 85% TM, 3+ AMRAP", () => {
    const sets = generateSession({ tms: TMS, phase: "wave", weekIndex: 3, dayNumber: 3 });
    const top = sets.find((s) => s.isAmrap);
    expect(top?.targetWeightKg).toBe(roundToPlate(205 * 0.85)); // 175
    expect(top?.targetReps).toBe(3);
  });

  it("week 4 is a deload with no AMRAP", () => {
    const sets = generateSession({ tms: TMS, phase: "wave", weekIndex: 4, dayNumber: 3 });
    expect(sets.some((s) => s.isAmrap)).toBe(false);
    expect(sets.some((s) => s.label === "Deload")).toBe(true);
  });
});

describe("generateSession - uncalibrated lift", () => {
  it("skips squat when its TM is missing", () => {
    const sets = generateSession({ tms: TMS, phase: "wave", weekIndex: 1, dayNumber: 2 });
    expect(sets.some((s) => s.liftId === "squat")).toBe(false);
    // Bench volume still present on day 2.
    expect(sets.some((s) => s.liftId === "bench")).toBe(true);
  });
});

describe("proposeTmChange - autoregulation (PROGRAM.md §7)", () => {
  it("bench: beat target by 2+ reps -> +2.5 kg", () => {
    const p = proposeTmChange({ lift: "bench", currentTm: 90, targetReps: 5, achievedReps: 7 });
    expect(p.reason).toBe("amrap_beat");
    expect(p.newTm).toBe(92.5);
    expect(p.deltaKg).toBe(2.5);
  });

  it("deadlift: beat target by 2+ reps -> +5 kg", () => {
    const p = proposeTmChange({ lift: "deadlift", currentTm: 205, targetReps: 3, achievedReps: 5 });
    expect(p.reason).toBe("amrap_beat");
    expect(p.newTm).toBe(210);
  });

  it("just hits the target -> small bump (bench +1.25, dl +2.5)", () => {
    const bench = proposeTmChange({ lift: "bench", currentTm: 90, targetReps: 5, achievedReps: 5 });
    expect(bench.reason).toBe("amrap_hit");
    expect(bench.newTm).toBe(91.25);

    const dl = proposeTmChange({ lift: "deadlift", currentTm: 205, targetReps: 3, achievedReps: 4 });
    expect(dl.reason).toBe("amrap_hit");
    expect(dl.newTm).toBe(207.5);
  });

  it("misses the target -> hold TM", () => {
    const p = proposeTmChange({ lift: "bench", currentTm: 90, targetReps: 5, achievedReps: 3 });
    expect(p.reason).toBe("amrap_miss");
    expect(p.newTm).toBe(90);
    expect(p.deltaKg).toBe(0);
  });
});

describe("reintroWeeklyBump (PROGRAM.md §7)", () => {
  it("adds 2.5 kg to bench and 5 kg to squat/DL", () => {
    expect(reintroWeeklyBump("bench", 90).newTm).toBe(92.5);
    expect(reintroWeeklyBump("deadlift", 205).newTm).toBe(210);
    expect(reintroWeeklyBump("squat", 100).newTm).toBe(105);
  });
});

describe("estimate1rm (PRD §6)", () => {
  it("Epley and Brzycki match known values", () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
    expect(brzycki(100, 5)).toBeCloseTo(112.5, 1);
  });

  it("returns the weight itself for a single", () => {
    expect(estimate1rm(140, 1)).toBe(140);
  });

  it("takes the higher of the two estimates", () => {
    expect(estimate1rm(100, 5)).toBeCloseTo(116.7, 1);
  });
});

describe("queue / cursor advance", () => {
  it("advances days 1->4 within a week", () => {
    const c = { phase: "wave" as const, weekIndex: 1, dayNumber: 1, cycleIndex: 1 };
    expect(advanceCursor(c).dayNumber).toBe(2);
  });

  it("rolls week over after day 4 in the wave", () => {
    const c = { phase: "wave" as const, weekIndex: 1, dayNumber: 4, cycleIndex: 1 };
    const n = advanceCursor(c);
    expect(n.weekIndex).toBe(2);
    expect(n.dayNumber).toBe(1);
  });

  it("transitions reintro -> wave after reintro week 3", () => {
    const c = { phase: "reintro_linear" as const, weekIndex: 3, dayNumber: 4, cycleIndex: 1 };
    const n = advanceCursor(c);
    expect(n.phase).toBe("wave");
    expect(n.weekIndex).toBe(1);
  });

  it("starts a new cycle after the wave deload week", () => {
    const c = { phase: "wave" as const, weekIndex: 4, dayNumber: 4, cycleIndex: 1 };
    const n = advanceCursor(c);
    expect(n.cycleIndex).toBe(2);
    expect(n.weekIndex).toBe(1);
  });

  it("flags heavy days 1 and 3 as progression days (wave, non-deload)", () => {
    expect(isProgressionDay("wave", 1, 1)).toBe(true);
    expect(isProgressionDay("wave", 1, 3)).toBe(true);
    expect(isProgressionDay("wave", 1, 2)).toBe(false);
    expect(isProgressionDay("wave", 4, 1)).toBe(false); // deload
    expect(isProgressionDay("reintro_linear", 1, 1)).toBe(false);
  });
});

describe("previewUpcoming - simulate the queue forward (pure)", () => {
  it("walks the cursor day 1->4 then rolls the week over", () => {
    const sessions = previewUpcoming({
      cursor: { phase: "wave", weekIndex: 1, dayNumber: 1, cycleIndex: 1 },
      tms: TMS,
      count: 5,
    });
    expect(sessions.map((s) => s.cursor.dayNumber)).toEqual([1, 2, 3, 4, 1]);
    expect(sessions[4].cursor.weekIndex).toBe(2);
    expect(sessions[4].weekRollover).toBe(true);
    expect(sessions[0].weekRollover).toBe(false);
  });

  it("transitions reintro -> wave within the preview window", () => {
    const sessions = previewUpcoming({
      cursor: { phase: "reintro_linear", weekIndex: 3, dayNumber: 3, cycleIndex: 1 },
      tms: TMS,
      count: 4,
    });
    // day 3, day 4, then wave week 1 day 1, day 2
    expect(sessions[2].cursor.phase).toBe("wave");
    expect(sessions[2].cursor.weekIndex).toBe(1);
  });

  it("projects reintro weekly TM bumps on week rollover and flags them", () => {
    const sessions = previewUpcoming({
      cursor: { phase: "reintro_linear", weekIndex: 1, dayNumber: 4, cycleIndex: 1 },
      tms: TMS,
      count: 2,
    });
    // First session (day 4) uses current TMs: deadlift light = 67.5% of 205.
    expect(sessions[0].tmsProjected).toBe(false);
    const dl0 = sessions[0].sets.find((s) => s.liftId === "deadlift" && !s.isWarmup);
    expect(dl0?.targetWeightKg).toBe(roundToPlate(205 * 0.675));
    // After the week rollover, DL TM is bumped +5 to 210; week 2 day 1 is DL medium (73%).
    expect(sessions[1].tmsProjected).toBe(true);
    const dl1 = sessions[1].sets.find((s) => s.liftId === "deadlift" && !s.isWarmup);
    expect(dl1?.targetWeightKg).toBe(roundToPlate(210 * 0.73));
  });

  it("flags wave week 4 day 3 as a deload", () => {
    const sessions = previewUpcoming({
      cursor: { phase: "wave", weekIndex: 4, dayNumber: 3, cycleIndex: 1 },
      tms: TMS,
      count: 1,
    });
    expect(sessions[0].isDeload).toBe(true);
    expect(sessions[0].isProgressionDay).toBe(false);
  });
});
