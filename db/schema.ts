import {
  pgTable,
  serial,
  text,
  real,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * The schema maps 1:1 to PRD §4. Weights are stored in kg as `real` (plate increments
 * are 1.25/2.5 kg, well within float precision). Weekly template days are NOT stored
 * here — they live in code (`lib/program/config.ts`) since they are part of the program
 * methodology, not user data.
 */

export const athlete = pgTable("athlete", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bodyweightKg: real("bodyweight_kg"),
  units: text("units").notNull().default("kg"),
  plateIncrementKg: real("plate_increment_kg").notNull().default(2.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The three core lifts. `id` is the lift name to keep references readable. */
export const lift = pgTable("lift", {
  id: text("id").primaryKey(), // "bench" | "deadlift" | "squat"
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athlete.id),
  name: text("name").notNull(),
  trainingMaxKg: real("training_max_kg"), // nullable: squat starts TBD
  tmUpdatedAt: timestamp("tm_updated_at", { withTimezone: true }),
});

/** Append-only history of every TM change. */
export const trainingMaxEvent = pgTable("training_max_event", {
  id: serial("id").primaryKey(),
  liftId: text("lift_id")
    .notNull()
    .references(() => lift.id),
  oldTm: real("old_tm"),
  newTm: real("new_tm").notNull(),
  reason: text("reason").notNull(), // amrap_beat | amrap_hit | manual | phase0_linear
  note: text("note"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row config holding the phase + the queue cursor (next day to perform). */
export const programConfig = pgTable("program_config", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athlete.id),
  phase: text("phase").notNull().default("reintro_linear"), // reintro_linear | wave
  weekIndex: integer("week_index").notNull().default(1), // 1..4 (wave) / 1..3 (reintro)
  dayNumber: integer("day_number").notNull().default(1), // next day in queue, 1..4
  cycleIndex: integer("cycle_index").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One workout instance generated from a weekly template day. */
export const session = pgTable("session", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athlete.id),
  dayNumber: integer("day_number").notNull(),
  phase: text("phase").notNull(),
  weekIndex: integer("week_index").notNull(),
  cycleIndex: integer("cycle_index").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress | completed
  datePlanned: timestamp("date_planned", { withTimezone: true }).notNull().defaultNow(),
  dateCompleted: timestamp("date_completed", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** What the app told the athlete to do (snapshot of the engine output at generation time). */
export const prescribedSet = pgTable("prescribed_set", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => session.id, { onDelete: "cascade" }),
  liftId: text("lift_id").notNull(),
  role: text("role").notNull(), // heavy | medium | light
  orderIndex: integer("order_index").notNull(),
  label: text("label"), // "Warm-up" | "Top set" | "Back-off" | "Volume" | "Speed"
  targetWeightKg: real("target_weight_kg").notNull(),
  targetReps: integer("target_reps").notNull(),
  isAmrap: boolean("is_amrap").notNull().default(false),
  isBackoff: boolean("is_backoff").notNull().default(false),
  isWarmup: boolean("is_warmup").notNull().default(false),
  targetRpe: real("target_rpe"),
});

/** What the athlete actually did. */
export const loggedSet = pgTable("logged_set", {
  id: serial("id").primaryKey(),
  prescribedSetId: integer("prescribed_set_id").references(() => prescribedSet.id, {
    onDelete: "set null",
  }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => session.id, { onDelete: "cascade" }),
  liftId: text("lift_id").notNull(),
  actualWeightKg: real("actual_weight_kg").notNull(),
  actualReps: integer("actual_reps").notNull(),
  actualRpe: real("actual_rpe"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Display-only accessory checklist (v1: not analyzed). */
export const accessoryItem = pgTable("accessory_item", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => session.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  name: text("name").notNull(),
  scheme: text("scheme").notNull(),
  done: boolean("done").notNull().default(false),
});

/** One logged set of an accessory exercise (weight/reps per set). */
export const accessorySet = pgTable("accessory_set", {
  id: serial("id").primaryKey(),
  accessoryItemId: integer("accessory_item_id")
    .notNull()
    .references(() => accessoryItem.id, { onDelete: "cascade" }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => session.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  weightKg: real("weight_kg"),
  reps: integer("reps"),
  rpe: real("rpe"),
});

/** Bundled exercise catalog (seeded from free-exercise-db; public domain). */
export const exercise = pgTable("exercise", {
  id: text("id").primaryKey(), // slug from free-exercise-db
  name: text("name").notNull(),
  force: text("force"),
  level: text("level"),
  mechanic: text("mechanic"),
  equipment: text("equipment"),
  category: text("category"),
  primaryMuscles: jsonb("primary_muscles").$type<string[]>().notNull().default([]),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
  instructions: jsonb("instructions").$type<string[]>().notNull().default([]),
});

export type Athlete = typeof athlete.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type Lift = typeof lift.$inferSelect;
export type TrainingMaxEvent = typeof trainingMaxEvent.$inferSelect;
export type ProgramConfig = typeof programConfig.$inferSelect;
export type Session = typeof session.$inferSelect;
export type PrescribedSet = typeof prescribedSet.$inferSelect;
export type LoggedSet = typeof loggedSet.$inferSelect;
export type AccessoryItem = typeof accessoryItem.$inferSelect;
export type AccessorySet = typeof accessorySet.$inferSelect;
