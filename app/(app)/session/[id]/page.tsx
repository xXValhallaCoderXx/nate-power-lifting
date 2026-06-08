import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAccessories,
  getAccessorySets,
  getAthlete,
  getLoggedSets,
  getAccessoryLastTimes,
  getPrescribedSets,
  getPreviousSameDaySnapshot,
  getSessionById,
} from "@/lib/queries";
import { LIFT_NAMES, WEEKLY_TEMPLATE, type LiftName, type Role } from "@/lib/program";
import { PageHeader, RoleBadge } from "@/components/ui";
import { SetCard } from "@/components/session/SetCard";
import { AccessoryManager } from "@/components/session/AccessoryManager";
import { LastSessionSnapshot } from "@/components/session/LastSessionSnapshot";
import { SessionControls } from "@/components/session/SessionControls";
import type { PrescribedSet } from "@/db";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  const sess = await getSessionById(sessionId);
  if (!sess) notFound();

  const [prescribed, logged, accessories, accessorySets, athlete, previousSnapshot] =
    await Promise.all([
      getPrescribedSets(sessionId),
      getLoggedSets(sessionId),
      getAccessories(sessionId),
      getAccessorySets(sessionId),
      getAthlete(),
      getPreviousSameDaySnapshot({
        id: sess.id,
        dayNumber: sess.dayNumber,
        phase: sess.phase,
        createdAt: sess.createdAt,
      }),
    ]);

  const accessoryLastByName = await getAccessoryLastTimes(
    { dayNumber: sess.dayNumber, createdAt: sess.createdAt },
    accessories.map((a) => a.name),
  );
  const uniqueAccessoryNames = [...new Set(accessories.map((a) => a.name))];
  const accessoryHistory = uniqueAccessoryNames.flatMap((name) => accessoryLastByName[name] ?? []);

  const plateIncrement = athlete?.plateIncrementKg ?? 2.5;
  const setsByItem: Record<number, typeof accessorySets> = {};
  for (const s of accessorySets) {
    (setsByItem[s.accessoryItemId] ??= []).push(s);
  }
  const loggedBySet = new Map(logged.filter((l) => l.prescribedSetId != null).map((l) => [l.prescribedSetId!, l]));
  const template = WEEKLY_TEMPLATE[sess.dayNumber];
  const completed = sess.status === "completed";

  // Group prescribed sets by lift, preserving order.
  const byLift = new Map<LiftName, PrescribedSet[]>();
  for (const s of prescribed) {
    const arr = byLift.get(s.liftId as LiftName) ?? [];
    arr.push(s);
    byLift.set(s.liftId as LiftName, arr);
  }

  return (
    <>
      <PageHeader
        title={`Day ${sess.dayNumber}`}
        subtitle={template?.name}
        right={
          <Link href="/" className="text-sm text-muted">
            Close
          </Link>
        }
      />

      <div className="flex flex-col gap-5 p-5">
        {completed ? (
          <div className="rounded-xl border border-light/40 bg-light/10 px-4 py-3 text-sm text-light">
            Session completed.{" "}
            <Link href={`/session/${sessionId}/complete`} className="underline">
              View summary
            </Link>
          </div>
        ) : null}

        <LastSessionSnapshot snapshot={previousSnapshot} accessories={accessoryHistory} />

        {[...byLift.entries()].map(([liftId, sets]) => {
          const role = (sets.find((s) => !s.isWarmup)?.role ?? sets[0].role) as Role;
          return (
            <section key={liftId}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">{LIFT_NAMES[liftId]}</h2>
                <RoleBadge role={role} />
              </div>
              <div className="flex flex-col gap-2">
                {sets.map((s) => (
                  <SetCard
                    key={s.id}
                    prescribed={s}
                    logged={loggedBySet.get(s.id) ?? null}
                    plateIncrement={plateIncrement}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section>
          <h2 className="mb-2 px-1 text-lg font-semibold">Accessories</h2>
          <AccessoryManager
            items={accessories}
            setsByItem={setsByItem}
            sessionId={sessionId}
            plateIncrement={plateIncrement}
          />
        </section>

        {!completed ? <SessionControls sessionId={sessionId} loggedCount={logged.length} /> : null}
      </div>
    </>
  );
}
