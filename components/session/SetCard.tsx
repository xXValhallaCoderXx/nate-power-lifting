"use client";

import { useState, useTransition } from "react";
import { Stepper } from "@/components/Stepper";
import { logSet, deleteLoggedSet } from "@/lib/actions";
import { kg } from "@/lib/format";
import type { PrescribedSet, LoggedSet } from "@/db";

export function SetCard({
  prescribed,
  logged,
  plateIncrement,
}: {
  prescribed: PrescribedSet;
  logged: LoggedSet | null;
  plateIncrement: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [weight, setWeight] = useState(logged?.actualWeightKg ?? prescribed.targetWeightKg);
  const [reps, setReps] = useState(logged?.actualReps ?? prescribed.targetReps);
  const [rpe, setRpe] = useState<number>(logged?.actualRpe ?? prescribed.targetRpe ?? 7);

  const isLogged = logged != null;

  function save() {
    const clamp = (n: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, Math.round(n * 100) / 100));
    const fd = new FormData();
    fd.set("sessionId", String(prescribed.sessionId));
    fd.set("prescribedSetId", String(prescribed.id));
    fd.set("liftId", prescribed.liftId);
    fd.set("weight", String(clamp(weight, 0, 1000)));
    fd.set("reps", String(clamp(reps, 0, 100)));
    fd.set("rpe", String(clamp(rpe, 1, 10)));
    startTransition(async () => {
      await logSet(fd);
      setOpen(false);
    });
  }

  function remove() {
    if (!logged) return;
    startTransition(async () => {
      await deleteLoggedSet(logged.id, prescribed.sessionId);
      setOpen(false);
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition ${
        isLogged ? "border-light/40 bg-light/[0.06]" : "border-border bg-surface2"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
              isLogged ? "border-light bg-light text-black" : "border-border text-muted"
            }`}
          >
            {isLogged ? "✓" : ""}
          </span>
          <span className="text-sm font-medium">{prescribed.label}</span>
          {prescribed.isAmrap ? (
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
              AMRAP
            </span>
          ) : null}
        </span>

        <span className="text-right font-mono text-sm">
          {isLogged ? (
            <span className="text-light">
              {kg(logged!.actualWeightKg)} x {logged!.actualReps}
              {logged!.actualRpe != null ? ` @${logged!.actualRpe}` : ""}
            </span>
          ) : (
            <span className="text-muted">
              {kg(prescribed.targetWeightKg)} x {prescribed.targetReps}
              {prescribed.isAmrap ? "+" : ""}
            </span>
          )}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border px-3 py-4">
          <div className="flex items-end gap-2">
            <Stepper
              label="Weight"
              value={weight}
              step={plateIncrement}
              min={0}
              max={1000}
              suffix="kg"
              onChange={setWeight}
            />
            <Stepper label="Reps" value={reps} step={1} min={0} max={100} onChange={setReps} />
            <Stepper label="RPE" value={rpe} step={0.5} min={1} max={10} onChange={setRpe} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={pending} onClick={save}>
              {pending ? "Saving..." : isLogged ? "Update" : "Log set"}
            </button>
            {isLogged ? (
              <button type="button" className="btn-secondary" disabled={pending} onClick={remove}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
