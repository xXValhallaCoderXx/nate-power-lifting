import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAmrapLogs,
  getLifts,
  getLoggedSets,
  getSessionById,
} from "@/lib/queries";
import {
  estimate1rm,
  proposeTmChange,
  LIFT_NAMES,
  type LiftName,
  type TmProposal,
} from "@/lib/program";
import { PageHeader, StatPill } from "@/components/ui";
import { TmProposalCard } from "@/components/session/TmProposalCard";
import { kg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SessionCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  const sess = await getSessionById(sessionId);
  if (!sess) notFound();

  const [logged, amrapLogs, lifts] = await Promise.all([
    getLoggedSets(sessionId),
    getAmrapLogs(sessionId),
    getLifts(),
  ]);

  const tmByLift = new Map(lifts.map((l) => [l.id, l.trainingMaxKg]));

  const tonnage = logged.reduce((sum, l) => sum + l.actualWeightKg * l.actualReps, 0);

  const bestE1rm = new Map<LiftName, number>();
  for (const l of logged) {
    const e = estimate1rm(l.actualWeightKg, l.actualReps);
    const lid = l.liftId as LiftName;
    if (!bestE1rm.has(lid) || e > bestE1rm.get(lid)!) bestE1rm.set(lid, e);
  }

  const proposals: TmProposal[] = [];
  for (const row of amrapLogs) {
    const currentTm = tmByLift.get(row.prescribed.liftId);
    if (currentTm == null) continue;
    proposals.push(
      proposeTmChange({
        lift: row.prescribed.liftId as LiftName,
        currentTm,
        targetReps: row.prescribed.targetReps,
        achievedReps: row.logged.actualReps,
      }),
    );
  }

  return (
    <>
      <PageHeader title="Session complete" subtitle={`Day ${sess.dayNumber}`} />

      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Sets logged" value={`${logged.length}`} />
          <StatPill label="Tonnage" value={`${Math.round(tonnage)} kg`} />
        </div>

        {bestE1rm.size > 0 ? (
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Best estimated 1RM today
            </h2>
            <ul className="flex flex-col gap-1">
              {[...bestE1rm.entries()].map(([lid, e]) => (
                <li key={lid} className="flex justify-between">
                  <span>{LIFT_NAMES[lid]}</span>
                  <span className="font-mono font-semibold">{kg(e)} kg</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {proposals.length > 0 ? (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              Training Max progression
            </h2>
            <div className="flex flex-col gap-3">
              {proposals.map((p) => (
                <TmProposalCard key={p.lift} proposal={p} />
              ))}
            </div>
          </section>
        ) : (
          <p className="px-1 text-sm text-muted">
            No AMRAP top set this session - Training Maxes unchanged.
          </p>
        )}

        <Link href="/" className="btn-primary w-full text-lg">
          Done
        </Link>
      </div>
    </>
  );
}
