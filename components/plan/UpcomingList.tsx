"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LIFT_NAMES,
  phaseLabel,
  WEEKLY_TEMPLATE,
  type LiftName,
  type PrescribedSet,
  type UpcomingSession,
} from "@/lib/program";
import { kg } from "@/lib/format";
import { PlanPreview } from "@/components/PlanPreview";
import { RoleBadge, EmptyState } from "@/components/ui";

/** Pick the dominant working line for a lift, e.g. "3x5 @ 75". */
function summarizeLift(sets: PrescribedSet[]): string | null {
  const working = sets.filter((s) => !s.isWarmup);
  if (working.length === 0) return null;

  const groups = new Map<string, { count: number; reps: number; weight: number; isAmrap: boolean }>();
  for (const s of working) {
    const key = `${s.targetWeightKg}-${s.targetReps}-${s.isAmrap}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { count: 1, reps: s.targetReps, weight: s.targetWeightKg, isAmrap: s.isAmrap });
  }
  const top = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  return `${top.count}x${top.reps}${top.isAmrap ? "+" : ""} @ ${kg(top.weight)} kg`;
}

function groupKey(s: UpcomingSession): string {
  return `${s.cursor.phase}-${s.cursor.cycleIndex}-${s.cursor.weekIndex}`;
}

function relativeWeekLabel(groupIndex: number): string {
  if (groupIndex === 0) return "This week";
  if (groupIndex === 1) return "Next week";
  return `In ${groupIndex} weeks`;
}

export function UpcomingList({ sessions }: { sessions: UpcomingSession[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sessions.length === 0) {
    return <EmptyState title="Nothing upcoming" hint="Set your Training Maxes on the Lifts tab." />;
  }

  // Group consecutive sessions into weeks for timeline headers.
  const groups: { key: string; sessions: { session: UpcomingSession; index: number }[] }[] = [];
  sessions.forEach((session, index) => {
    const key = groupKey(session);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.sessions.push({ session, index });
    else groups.push({ key, sessions: [{ session, index }] });
  });

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, gi) => {
        const head = group.sessions[0].session;
        return (
          <section key={group.key} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="section-title">{relativeWeekLabel(gi)}</h2>
              <span className="text-xs text-muted">
                {phaseLabel(head.cursor.phase)} - Week {head.cursor.weekIndex}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {group.sessions.map(({ session, index }) => (
                <SessionCard
                  key={index}
                  session={session}
                  isNext={index === 0}
                  isExpanded={expanded === index}
                  onToggle={() => setExpanded(expanded === index ? null : index)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SessionCard({
  session,
  isNext,
  isExpanded,
  onToggle,
}: {
  session: UpcomingSession;
  isNext: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const template = WEEKLY_TEMPLATE[session.cursor.dayNumber];
  const slots = template?.slots ?? [];

  const byLift = new Map<LiftName, PrescribedSet[]>();
  for (const s of session.sets) {
    const arr = byLift.get(s.liftId) ?? [];
    arr.push(s);
    byLift.set(s.liftId, arr);
  }

  const hasSets = session.sets.length > 0;

  return (
    <div
      className={`card ${isNext ? "border-accent/40 shadow-glow" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              {isNext ? "Next up" : `Day ${session.cursor.dayNumber}`}
            </span>
            {session.isProgressionDay ? (
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                AMRAP
              </span>
            ) : null}
            {session.isDeload ? (
              <span className="chip border-light/30 bg-light/15 text-light">Deload</span>
            ) : null}
            {session.tmsProjected ? (
              <span className="chip border-border bg-surface2 text-muted">Projected</span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-lg font-semibold">{template?.name ?? "Rest"}</div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`mt-1 shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!isExpanded ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {slots.map((slot) => {
            const summary = summarizeLift(byLift.get(slot.lift) ?? []);
            return (
              <div key={`${slot.lift}-${slot.role}`} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{LIFT_NAMES[slot.lift]}</span>
                  <RoleBadge role={slot.role} />
                </span>
                <span className="font-mono text-xs text-muted">{summary ?? "Set TM"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          {hasSets ? (
            <PlanPreview sets={session.sets} />
          ) : (
            <EmptyState title="Nothing prescribed" hint="Set your Training Maxes on the Lifts tab." />
          )}
        </div>
      )}

      {isNext ? (
        <Link href="/" className="btn-primary mt-3 w-full text-sm">
          Go to Today
        </Link>
      ) : null}
    </div>
  );
}
