import { config } from "dotenv";
config({ path: ".env.local" });

import { db, athlete, lift, programConfig, trainingMaxEvent } from "./index";
import { eq } from "drizzle-orm";

/**
 * Seeds the single athlete, the three core lifts with their starting TMs (Bench 90,
 * Deadlift 205, Squat TBD), and the program config at Phase 0 / week 1 / day 1.
 * See PROGRAM.md §4 & §9. Safe to re-run: it upserts and won't duplicate.
 */
async function main() {
  console.log("Seeding...");

  const existing = await db.select().from(athlete).limit(1);
  let athleteId: number;

  if (existing.length > 0) {
    athleteId = existing[0].id;
    console.log(`Athlete already exists (id=${athleteId}); ensuring lifts/config.`);
  } else {
    const [a] = await db
      .insert(athlete)
      .values({ name: "Athlete", bodyweightKg: 70, units: "kg", plateIncrementKg: 2.5 })
      .returning();
    athleteId = a.id;
    console.log(`Created athlete id=${athleteId}`);
  }

  const now = new Date();
  const startingLifts: { id: string; name: string; tm: number | null }[] = [
    { id: "bench", name: "Bench Press", tm: 90 },
    { id: "deadlift", name: "Deadlift", tm: 205 },
    { id: "squat", name: "Squat", tm: null }, // calibrate on first Day 2
  ];

  for (const l of startingLifts) {
    const found = await db.select().from(lift).where(eq(lift.id, l.id)).limit(1);
    if (found.length === 0) {
      await db.insert(lift).values({
        id: l.id,
        athleteId,
        name: l.name,
        trainingMaxKg: l.tm,
        tmUpdatedAt: l.tm != null ? now : null,
      });
      if (l.tm != null) {
        await db.insert(trainingMaxEvent).values({
          liftId: l.id,
          oldTm: null,
          newTm: l.tm,
          reason: "manual",
          note: "Initial TM (PROGRAM.md §4)",
          at: now,
        });
      }
      console.log(`  + lift ${l.id} TM=${l.tm ?? "TBD"}`);
    } else {
      console.log(`  = lift ${l.id} already present`);
    }
  }

  const cfg = await db.select().from(programConfig).limit(1);
  if (cfg.length === 0) {
    await db.insert(programConfig).values({
      athleteId,
      phase: "reintro_linear",
      weekIndex: 1,
      dayNumber: 1,
      cycleIndex: 1,
    });
    console.log("  + program config: reintro_linear, week 1, day 1");
  } else {
    console.log("  = program config already present");
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
