"use client";

import { useState, useTransition } from "react";
import { NumberField } from "@/components/NumberField";
import { logSet, deleteLoggedSet } from "@/lib/actions";
import { kg } from "@/lib/format";
import type { PrescribedSet, LoggedSet } from "@/db";
import type { PreviousSessionSnapshot } from "@/lib/queries";

type PrevSet = PreviousSessionSnapshot["mainLifts"][number]["sets"][number];

export interface SetRowData {
  prescribed: PrescribedSet;
  logged: LoggedSet | null;
}

const GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_2.75rem_2.75rem_2rem] items-center gap-2";
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, round2(n)));

/** Abbreviate a set label so it fits the dense first column. */
function shortLabel(label: string | null): string {
  switch (label) {
    case "Warm-up":
      return "W";
    case "Top set":
    case "Top set (AMRAP)":
      return "Top";
    case "Back-off":
      return "B/O";
    case "Volume":
      return "Vol";
    case "Speed":
      return "Spd";
    case "Deload":
      return "DL";
    default:
      return label?.slice(0, 3) ?? "-";
  }
}

export function SetTable({
  rows,
  previousSets,
  plateIncrement,
}: {
  rows: SetRowData[];
  previousSets: PrevSet[];
  plateIncrement: number;
}) {
  // Match each current set to its previous counterpart by label + occurrence order.
  const prevByKey = new Map<string, PrevSet>();
  const prevCounter = new Map<string, number>();
  for (const p of previousSets) {
    const label = p.label ?? "";
    const idx = prevCounter.get(label) ?? 0;
    prevCounter.set(label, idx + 1);
    prevByKey.set(`${label}#${idx}`, p);
  }

  const curCounter = new Map<string, number>();

  return (
    <div className="card overflow-hidden p-3">
      <div
        className={`${GRID} px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted`}
      >
        <span>Set</span>
        <span>Prev</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RPE</span>
        <span />
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const label = row.prescribed.label ?? "";
          const idx = curCounter.get(label) ?? 0;
          curCounter.set(label, idx + 1);
          const prev = prevByKey.get(`${label}#${idx}`) ?? null;
          return <SetRow key={row.prescribed.id} row={row} prev={prev} plateIncrement={plateIncrement} />;
        })}
      </div>
    </div>
  );
}

function SetRow({
  row,
  prev,
  plateIncrement,
}: {
  row: SetRowData;
  prev: PrevSet | null;
  plateIncrement: number;
}) {
  const { prescribed, logged } = row;
  const [weight, setWeight] = useState(logged?.actualWeightKg ?? prescribed.targetWeightKg);
  const [reps, setReps] = useState(logged?.actualReps ?? prescribed.targetReps);
  const [rpe, setRpe] = useState<number>(logged?.actualRpe ?? prescribed.targetRpe ?? 7);
  const [pending, startTransition] = useTransition();

  const isLogged = logged != null;
  const dirty =
    isLogged &&
    (round2(weight) !== logged.actualWeightKg ||
      round2(reps) !== logged.actualReps ||
      round2(rpe) !== round2(logged.actualRpe ?? rpe));

  function save() {
    const fd = new FormData();
    fd.set("sessionId", String(prescribed.sessionId));
    fd.set("prescribedSetId", String(prescribed.id));
    fd.set("liftId", prescribed.liftId);
    fd.set("weight", String(clamp(weight, 0, 1000)));
    fd.set("reps", String(clamp(reps, 0, 100)));
    fd.set("rpe", String(clamp(rpe, 1, 10)));
    startTransition(async () => {
      await logSet(fd);
    });
  }

  function remove() {
    if (!logged) return;
    startTransition(async () => {
      await deleteLoggedSet(logged.id, prescribed.sessionId);
    });
  }

  function onCheck() {
    if (!isLogged || dirty) save();
    else remove();
  }

  const tag = shortLabel(prescribed.label);

  return (
    <div className={`${GRID} rounded-xl px-1 py-1 ${isLogged ? "bg-light/[0.07]" : ""}`}>
      <span
        className={`truncate text-xs font-bold ${prescribed.isAmrap ? "text-accent" : "text-muted"}`}
        title={prescribed.label ?? undefined}
      >
        {tag}
        {prescribed.isAmrap ? "+" : ""}
      </span>

      <span className="truncate font-mono text-xs text-muted">
        {prev ? `${kg(prev.weightKg)}x${prev.reps}` : "-"}
      </span>

      <NumberField
        value={weight}
        min={0}
        max={1000}
        compact
        ariaLabel={`${tag} weight kg`}
        onChange={(v) => setWeight(round2(v))}
      />
      <NumberField
        value={reps}
        min={0}
        max={100}
        compact
        ariaLabel={`${tag} reps`}
        onChange={setReps}
      />
      <NumberField
        value={rpe}
        min={1}
        max={10}
        compact
        ariaLabel={`${tag} rpe`}
        onChange={setRpe}
      />

      <button
        type="button"
        onClick={onCheck}
        disabled={pending}
        aria-label={isLogged ? (dirty ? "update set" : "clear set") : "log set"}
        className={`flex h-8 w-8 items-center justify-center justify-self-center rounded-full border text-sm font-bold transition active:scale-90 ${
          isLogged && !dirty
            ? "border-light bg-light text-black"
            : dirty
              ? "border-accent text-accent"
              : "border-border text-muted"
        }`}
      >
        {isLogged ? (dirty ? "↑" : "✓") : ""}
      </button>
    </div>
  );
}
