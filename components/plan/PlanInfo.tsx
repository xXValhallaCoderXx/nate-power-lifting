"use client";

import { useState } from "react";
import {
  BACKOFF_PCT_OF_TOP,
  BACKOFF_SETS,
  BEAT_MARGIN,
  LIFT_NAMES,
  REINTRO_HEAVY,
  REINTRO_WEEKLY_TM_BUMP,
  REINTRO_WEEKS,
  ROLE_PCT,
  ROLE_SETS,
  TM_DELTAS,
  WARMUP_RAMP,
  WAVE,
  WAVE_WEEKS,
  WEEKLY_TEMPLATE,
  phaseLabel,
  roundToPlate,
  type LiftName,
  type Phase,
  type TrainingMaxes,
} from "@/lib/program";
import { kg } from "@/lib/format";
import { RoleBadge } from "@/components/ui";

const LIFTS: LiftName[] = ["bench", "deadlift", "squat"];
const pct = (p: number) => `${+(p * 100).toFixed(2)}%`;

export function PlanInfo({
  tms,
  plateIncrement,
  currentPhase,
  currentWeek,
}: {
  tms: TrainingMaxes;
  plateIncrement: number;
  currentPhase: Phase;
  currentWeek: number;
}) {
  const [open, setOpen] = useState(false);

  /** Working load for a lift at a given % of TM, rounded like the engine does. */
  const load = (lift: LiftName, p: number): string => {
    const tm = tms[lift];
    if (tm == null || tm <= 0) return "TBD";
    return `${kg(roundToPlate(tm * p, plateIncrement))}`;
  };
  const liftLine = (p: number) =>
    LIFTS.map((l) => `${LIFT_NAMES[l]} ${load(l, p)}`).join("  -  ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary flex w-full items-center justify-center gap-2 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
        How this plan works
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-md flex-col">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <h2 className="flex-1 text-lg font-semibold">About this plan</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-sm leading-relaxed">
              <p className="text-muted">
                A high-frequency, AMRAP-autoregulated powerlifting plan: each lift trains 2-3x/week
                with a Heavy / Medium / Light job per day. All working weights are a percentage of
                your Training Max (TM). The numbers below are computed by the same engine that builds
                your sessions, so you can sanity-check them.
              </p>

              {/* Phases */}
              <Section title="Phases">
                <p>
                  <Active on={currentPhase === "reintro_linear"}>Reintro (linear)</Active> - weeks
                  1-{REINTRO_WEEKS}. Top set ~{pct(REINTRO_HEAVY.topSetPct)} TM for{" "}
                  {REINTRO_HEAVY.reps} reps at RPE {REINTRO_HEAVY.rpe}, no AMRAP. The TM bumps
                  automatically each week (see progression).
                </p>
                <p className="mt-2">
                  <Active on={currentPhase === "wave"}>Wave</Active> - a {WAVE_WEEKS}-week undulating
                  cycle (week {WAVE_WEEKS} is a deload). The heavy day is an AMRAP that drives TM
                  progression.
                </p>
              </Section>

              {/* Weekly structure */}
              <Section title="Weekly structure">
                <div className="flex flex-col gap-2">
                  {Object.keys(WEEKLY_TEMPLATE)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((day) => {
                      const t = WEEKLY_TEMPLATE[day];
                      return (
                        <div key={day} className="rounded-xl bg-surface2 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                            Day {day}
                          </div>
                          <div className="mb-1.5 font-medium">{t.name}</div>
                          <div className="flex flex-col gap-1">
                            {t.slots.map((s, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span>
                                  {LIFT_NAMES[s.lift]}
                                  {s.isVariation ? " (variation)" : ""}
                                </span>
                                <RoleBadge role={s.role} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Section>

              {/* Intensity by role */}
              <Section title="Intensity by role (% of TM)">
                <Row
                  label="Medium / Volume"
                  meta={`${pct(ROLE_PCT.medium)} - ${ROLE_SETS.medium.sets}x${ROLE_SETS.medium.reps} @RPE ${ROLE_SETS.medium.rpe}`}
                  detail={liftLine(ROLE_PCT.medium)}
                />
                <Row
                  label="Light / Speed"
                  meta={`${pct(ROLE_PCT.light)} - ${ROLE_SETS.light.sets}x${ROLE_SETS.light.reps} @RPE ${ROLE_SETS.light.rpe}`}
                  detail={liftLine(ROLE_PCT.light)}
                />
                <Row
                  label="Heavy"
                  meta="varies by phase / wave week (see below)"
                  detail={`Back-off: ${BACKOFF_SETS} sets at -${(+((1 - BACKOFF_PCT_OF_TOP) * 100).toFixed(2))}% of the top set`}
                />
              </Section>

              {/* Wave table */}
              <Section title="Wave weeks (heavy top set)">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[2.5rem_3.25rem_3rem_1fr_1fr] gap-1 bg-surface2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    <span>Week</span>
                    <span>%TM</span>
                    <span>Reps</span>
                    <span className="text-right">Bench</span>
                    <span className="text-right">DL</span>
                  </div>
                  {Object.keys(WAVE)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((w) => {
                      const wk = WAVE[w];
                      const here = currentPhase === "wave" && currentWeek === w;
                      return (
                        <div
                          key={w}
                          className={`grid grid-cols-[2.5rem_3.25rem_3rem_1fr_1fr] gap-1 px-2 py-1.5 text-xs tabular-nums ${
                            here ? "bg-accent/10 text-accent" : ""
                          }`}
                        >
                          <span className="font-bold">{w}</span>
                          <span>{pct(wk.topSetPct)}</span>
                          <span>{wk.isDeload ? "deload" : `${wk.amrapMinReps}+`}</span>
                          <span className="text-right font-mono">{load("bench", wk.topSetPct)}</span>
                          <span className="text-right font-mono">{load("deadlift", wk.topSetPct)}</span>
                        </div>
                      );
                    })}
                </div>
              </Section>

              {/* Warm-up ramp */}
              <Section title="Warm-up ramp (% of top set)">
                <p className="font-mono text-xs text-muted">
                  {WARMUP_RAMP.map((w) => `${pct(w.pct)}x${w.reps}`).join("  ->  ")}
                </p>
              </Section>

              {/* Progression */}
              <Section title="TM progression">
                <p className="mb-2">
                  On each heavy-day AMRAP, beating the rep target by {BEAT_MARGIN}+ bumps the TM;
                  just hitting it gives a small bump; missing holds the TM and repeats the cycle.
                </p>
                <div className="flex flex-col gap-1">
                  {LIFTS.map((l) => (
                    <div key={l} className="flex items-center justify-between gap-2">
                      <span>{LIFT_NAMES[l]}</span>
                      <span className="font-mono text-xs">
                        beat +{TM_DELTAS[l].beat} - hit +{TM_DELTAS[l].hit} - reintro/wk +
                        {REINTRO_WEEKLY_TM_BUMP[l]}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Current TMs */}
              <Section title="Your Training Maxes">
                <div className="flex flex-col gap-1">
                  {LIFTS.map((l) => (
                    <div key={l} className="flex items-center justify-between gap-2">
                      <span>{LIFT_NAMES[l]}</span>
                      <span className="font-mono">
                        {tms[l] != null ? `${kg(tms[l]!)} kg` : "TBD"}
                      </span>
                    </div>
                  ))}
                  <p className="mt-1 text-xs text-muted">
                    Loads are rounded to the nearest {kg(plateIncrement)} kg.
                  </p>
                </div>
              </Section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="section-title mb-2 block">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, meta, detail }: { label: string; meta: string; detail: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted">{meta}</span>
      </div>
      <div className="mt-0.5 font-mono text-xs text-muted">{detail}</div>
    </div>
  );
}

function Active({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={`font-semibold ${on ? "text-accent" : "text-white"}`}>
      {children}
      {on ? <span className="ml-1 text-[10px] uppercase tracking-wide text-accent">(current)</span> : null}
    </span>
  );
}
