"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  db,
  lift,
  programConfig,
  session,
  prescribedSet,
  loggedSet,
  accessoryItem,
  accessorySet,
  trainingMaxEvent,
  athlete,
} from "@/db";
import {
  ACCESSORIES,
  advanceCursor,
  generateSession,
  reintroWeeklyBump,
  type Cursor,
  type LiftName,
  type Phase,
  type TmChangeReason,
  type TrainingMaxes,
} from "@/lib/program";
import { getActiveSession, getProgramConfig, getTrainingMaxes } from "@/lib/queries";

/** Start (or resume) a session for the current queue position. */
export async function startSession() {
  const active = await getActiveSession();
  if (active) redirect(`/session/${active.id}`);

  const cfg = await getProgramConfig();
  if (!cfg) throw new Error("No program config. Run the seed script.");
  const tms = await getTrainingMaxes();
  const athleteRow = (await db.select().from(athlete).limit(1))[0];
  const increment = athleteRow?.plateIncrementKg ?? 2.5;

  const sets = generateSession({
    tms,
    phase: cfg.phase as Phase,
    weekIndex: cfg.weekIndex,
    dayNumber: cfg.dayNumber,
    plateIncrementKg: increment,
  });

  const [created] = await db
    .insert(session)
    .values({
      athleteId: cfg.athleteId,
      dayNumber: cfg.dayNumber,
      phase: cfg.phase,
      weekIndex: cfg.weekIndex,
      cycleIndex: cfg.cycleIndex,
      status: "in_progress",
    })
    .returning();

  if (sets.length > 0) {
    await db.insert(prescribedSet).values(
      sets.map((s) => ({
        sessionId: created.id,
        liftId: s.liftId,
        role: s.role,
        orderIndex: s.orderIndex,
        label: s.label,
        targetWeightKg: s.targetWeightKg,
        targetReps: s.targetReps,
        isAmrap: s.isAmrap,
        isBackoff: s.isBackoff,
        isWarmup: s.isWarmup,
        targetRpe: s.targetRpe,
      })),
    );
  }

  const accessories = ACCESSORIES[cfg.dayNumber] ?? [];
  if (accessories.length > 0) {
    await db.insert(accessoryItem).values(
      accessories.map((a, i) => ({
        sessionId: created.id,
        orderIndex: i,
        name: a.name,
        scheme: a.scheme,
        done: false,
      })),
    );
  }

  revalidatePath("/");
  redirect(`/session/${created.id}`);
}

/** Log (or re-log) an actual set against a prescription. */
export async function logSet(formData: FormData) {
  const sessionId = Number(formData.get("sessionId"));
  const prescribedSetId = Number(formData.get("prescribedSetId"));
  const liftId = String(formData.get("liftId"));
  const weight = Number(formData.get("weight"));
  const reps = Number(formData.get("reps"));
  const rpeRaw = formData.get("rpe");
  const rpe = rpeRaw === null || rpeRaw === "" ? null : Number(rpeRaw);

  // Overwrite any existing log for this prescribed set (re-logging a set).
  const existing = await db
    .select()
    .from(loggedSet)
    .where(eq(loggedSet.prescribedSetId, prescribedSetId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(loggedSet)
      .set({ actualWeightKg: weight, actualReps: reps, actualRpe: rpe, loggedAt: new Date() })
      .where(eq(loggedSet.id, existing[0].id));
  } else {
    await db.insert(loggedSet).values({
      sessionId,
      prescribedSetId,
      liftId,
      actualWeightKg: weight,
      actualReps: reps,
      actualRpe: rpe,
    });
  }

  revalidatePath(`/session/${sessionId}`);
}

export async function deleteLoggedSet(loggedSetId: number, sessionId: number) {
  await db.delete(loggedSet).where(eq(loggedSet.id, loggedSetId));
  revalidatePath(`/session/${sessionId}`);
}

export async function toggleAccessory(id: number, done: boolean, sessionId: number) {
  await db.update(accessoryItem).set({ done }).where(eq(accessoryItem.id, id));
  revalidatePath(`/session/${sessionId}`);
}

/** Add an accessory (chosen from the exercise catalog) to a session. */
export async function addAccessory(formData: FormData) {
  const sessionId = Number(formData.get("sessionId"));
  const name = String(formData.get("name") || "").trim();
  const scheme = String(formData.get("scheme") || "").trim() || "3x10";
  if (!name) return;

  const existing = await db
    .select({ orderIndex: accessoryItem.orderIndex })
    .from(accessoryItem)
    .where(eq(accessoryItem.sessionId, sessionId));
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.orderIndex), -1) + 1;

  await db.insert(accessoryItem).values({ sessionId, orderIndex: nextOrder, name, scheme, done: false });
  revalidatePath(`/session/${sessionId}`);
}

export async function removeAccessory(id: number, sessionId: number) {
  await db.delete(accessoryItem).where(eq(accessoryItem.id, id));
  revalidatePath(`/session/${sessionId}`);
}

/** Replace the exercise of an existing accessory slot (swap) and clear its logged sets. */
export async function swapAccessory(formData: FormData) {
  const id = Number(formData.get("id"));
  const sessionId = Number(formData.get("sessionId"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await db.delete(accessorySet).where(eq(accessorySet.accessoryItemId, id));
  await db.update(accessoryItem).set({ name, done: false }).where(eq(accessoryItem.id, id));
  revalidatePath(`/session/${sessionId}`);
}

/** Replace all logged sets for an accessory (per-set weight/reps). */
export async function saveAccessorySets(formData: FormData) {
  const accessoryItemId = Number(formData.get("accessoryItemId"));
  const sessionId = Number(formData.get("sessionId"));
  const raw = String(formData.get("sets") || "[]");

  let parsed: { weightKg: number | null; reps: number | null; rpe: number | null }[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }

  await db.delete(accessorySet).where(eq(accessorySet.accessoryItemId, accessoryItemId));

  const rows = parsed.map((s, i) => ({
    accessoryItemId,
    sessionId,
    orderIndex: i,
    weightKg: s.weightKg != null && Number.isFinite(s.weightKg) ? s.weightKg : null,
    reps: s.reps != null && Number.isFinite(s.reps) ? s.reps : null,
    rpe: s.rpe != null && Number.isFinite(s.rpe) ? s.rpe : null,
  }));

  if (rows.length > 0) {
    await db.insert(accessorySet).values(rows);
  }

  const anyLogged = rows.some((r) => r.weightKg != null || r.reps != null);
  await db.update(accessoryItem).set({ done: anyLogged }).where(eq(accessoryItem.id, accessoryItemId));

  revalidatePath(`/session/${sessionId}`);
}

/** Mark a session complete, advance the queue cursor, and apply reintro linear bumps. */
export async function completeSession(sessionId: number) {
  const sess = (await db.select().from(session).where(eq(session.id, sessionId)).limit(1))[0];
  if (!sess) throw new Error("Session not found");

  await db
    .update(session)
    .set({ status: "completed", dateCompleted: new Date() })
    .where(eq(session.id, sessionId));

  const cfg = await getProgramConfig();
  if (cfg) {
    const current: Cursor = {
      phase: cfg.phase as Phase,
      weekIndex: cfg.weekIndex,
      dayNumber: cfg.dayNumber,
      cycleIndex: cfg.cycleIndex,
    };
    const nextCursor = advanceCursor(current);

    // Reintro phase: when a week rolls over (still reintro), apply the linear weekly TM bump.
    const rolledWeekInReintro =
      current.phase === "reintro_linear" &&
      nextCursor.phase === "reintro_linear" &&
      nextCursor.weekIndex > current.weekIndex;

    if (rolledWeekInReintro) {
      const lifts = await db.select().from(lift);
      for (const l of lifts) {
        if (l.trainingMaxKg == null) continue;
        const proposal = reintroWeeklyBump(l.id as LiftName, l.trainingMaxKg);
        await applyTmInternal(l.id, proposal.oldTm, proposal.newTm, "phase0_linear", proposal.message);
      }
    }

    await db
      .update(programConfig)
      .set({
        phase: nextCursor.phase,
        weekIndex: nextCursor.weekIndex,
        dayNumber: nextCursor.dayNumber,
        cycleIndex: nextCursor.cycleIndex,
        updatedAt: new Date(),
      })
      .where(eq(programConfig.id, cfg.id));
  }

  revalidatePath("/");
  revalidatePath("/lifts");
  revalidatePath(`/session/${sessionId}`);
}

async function applyTmInternal(
  liftId: string,
  oldTm: number | null,
  newTm: number,
  reason: TmChangeReason,
  note?: string,
) {
  await db
    .update(lift)
    .set({ trainingMaxKg: newTm, tmUpdatedAt: new Date() })
    .where(eq(lift.id, liftId));
  await db.insert(trainingMaxEvent).values({ liftId, oldTm, newTm, reason, note: note ?? null });
}

/** Accept (or edit) a proposed TM change from the AMRAP result. */
export async function applyTmChange(formData: FormData) {
  const liftId = String(formData.get("liftId"));
  const newTm = Number(formData.get("newTm"));
  const reason = String(formData.get("reason") || "manual") as TmChangeReason;
  const note = formData.get("note") ? String(formData.get("note")) : undefined;
  const redirectTo = formData.get("redirectTo") ? String(formData.get("redirectTo")) : null;

  const current = (await db.select().from(lift).where(eq(lift.id, liftId)).limit(1))[0];
  await applyTmInternal(liftId, current?.trainingMaxKg ?? null, newTm, reason, note);

  revalidatePath("/lifts");
  revalidatePath("/");
  if (redirectTo) redirect(redirectTo);
}

/** Manually set or calibrate a lift's TM (e.g. squat). */
export async function setTrainingMax(formData: FormData) {
  const liftId = String(formData.get("liftId"));
  const newTm = Number(formData.get("newTm"));
  if (!Number.isFinite(newTm) || newTm <= 0) return;
  const current = (await db.select().from(lift).where(eq(lift.id, liftId)).limit(1))[0];
  await applyTmInternal(liftId, current?.trainingMaxKg ?? null, newTm, "manual", "Manual edit");
  revalidatePath("/lifts");
  revalidatePath("/");
}

export async function updateSettings(formData: FormData) {
  const athleteRow = (await db.select().from(athlete).limit(1))[0];
  if (!athleteRow) return;
  const bodyweight = Number(formData.get("bodyweight"));
  const increment = Number(formData.get("plateIncrement"));
  await db
    .update(athlete)
    .set({
      bodyweightKg: Number.isFinite(bodyweight) && bodyweight > 0 ? bodyweight : athleteRow.bodyweightKg,
      plateIncrementKg: increment === 1.25 || increment === 2.5 ? increment : athleteRow.plateIncrementKg,
    })
    .where(eq(athlete.id, athleteRow.id));
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function setPhase(formData: FormData) {
  const phase = String(formData.get("phase")) as Phase;
  const cfg = await getProgramConfig();
  if (!cfg) return;
  await db
    .update(programConfig)
    .set({ phase, weekIndex: 1, dayNumber: 1, updatedAt: new Date() })
    .where(eq(programConfig.id, cfg.id));
  revalidatePath("/settings");
  revalidatePath("/");
}

/** Advance the queue without logging (skip a day). */
export async function skipDay() {
  const cfg = await getProgramConfig();
  if (!cfg) return;
  const next = advanceCursor({
    phase: cfg.phase as Phase,
    weekIndex: cfg.weekIndex,
    dayNumber: cfg.dayNumber,
    cycleIndex: cfg.cycleIndex,
  });
  await db
    .update(programConfig)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(programConfig.id, cfg.id));
  revalidatePath("/");
}

export async function cancelSession(sessionId: number) {
  await db.delete(session).where(eq(session.id, sessionId));
  revalidatePath("/");
  redirect("/");
}

// Re-export so client components can import everything from one module if convenient.
export type { TrainingMaxes };
