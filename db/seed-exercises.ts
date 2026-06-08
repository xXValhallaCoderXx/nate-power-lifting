import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, exercise } from "./index";
import { sql } from "drizzle-orm";

/**
 * Loads the bundled free-exercise-db catalog (public domain, ~870 exercises) into the
 * `exercise` table. Idempotent: upserts by id. Run with `npm run db:seed-exercises`.
 */
interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

async function main() {
  const file = join(process.cwd(), "data", "exercises.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as RawExercise[];
  console.log(`Loading ${raw.length} exercises...`);

  const rows = raw.map((e) => ({
    id: e.id,
    name: e.name,
    force: e.force ?? null,
    level: e.level ?? null,
    mechanic: e.mechanic ?? null,
    equipment: e.equipment ?? null,
    category: e.category ?? null,
    primaryMuscles: e.primaryMuscles ?? [],
    secondaryMuscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
  }));

  // Insert in chunks to stay well under parameter limits.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(exercise)
      .values(chunk)
      .onConflictDoUpdate({
        target: exercise.id,
        set: {
          name: sql`excluded.name`,
          force: sql`excluded.force`,
          level: sql`excluded.level`,
          mechanic: sql`excluded.mechanic`,
          equipment: sql`excluded.equipment`,
          category: sql`excluded.category`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          instructions: sql`excluded.instructions`,
        },
      });
    console.log(`  upserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log("Exercise catalog seeded.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
