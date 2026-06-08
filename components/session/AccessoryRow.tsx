"use client";

import { useState, useTransition } from "react";
import { toggleAccessory, saveAccessorySets } from "@/lib/actions";
import { kg, parseScheme } from "@/lib/format";
import { NumberField } from "@/components/NumberField";
import type { AccessoryItem, AccessorySet } from "@/db";

interface EditableSet {
  weightKg: number;
  reps: number;
  rpe: number;
}

function initialSets(item: AccessoryItem, logged: AccessorySet[]): EditableSet[] {
  if (logged.length > 0) {
    return logged.map((s) => ({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0, rpe: s.rpe ?? 8 }));
  }
  const { sets, reps } = parseScheme(item.scheme);
  return Array.from({ length: sets }, () => ({ weightKg: 0, reps: reps ?? 8, rpe: 8 }));
}

export function AccessoryRow({
  item,
  sets,
  plateIncrement,
  onSwap,
  onRemove,
}: {
  item: AccessoryItem;
  sets: AccessorySet[];
  plateIncrement: number;
  onSwap?: () => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<EditableSet[]>(() => initialSets(item, sets));

  const hasLog = sets.length > 0;
  const round = (n: number) => Math.round(n * 100) / 100;

  function update(i: number, patch: Partial<EditableSet>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addSet() {
    setRows((prev) => [...prev, { ...(prev[prev.length - 1] ?? { weightKg: 0, reps: 8, rpe: 8 }) }]);
  }
  function removeSet(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    const fd = new FormData();
    fd.set("accessoryItemId", String(item.id));
    fd.set("sessionId", String(item.sessionId));
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, round(n)));
    fd.set(
      "sets",
      JSON.stringify(
        rows.map((r) => ({
          weightKg: clamp(r.weightKg, 0, 1000),
          reps: clamp(r.reps, 0, 100),
          rpe: clamp(r.rpe, 1, 10),
        })),
      ),
    );
    startTransition(async () => {
      await saveAccessorySets(fd);
      setOpen(false);
    });
  }

  function quickToggle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await toggleAccessory(item.id, !item.done, item.sessionId);
    });
  }

  const summary = sets
    .map((s) => `${kg(s.weightKg)}x${s.reps ?? "-"}${s.rpe != null ? `@${s.rpe}` : ""}`)
    .join("  ");

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition ${
        item.done ? "border-light/40 bg-light/[0.06]" : "border-border bg-surface2"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className={`truncate font-medium ${item.done ? "text-muted line-through" : ""}`}>
            {item.name}
          </div>
          <div className="mt-0.5 truncate font-mono text-xs">
            {hasLog ? <span className="text-light">{summary}</span> : <span className="text-muted">{item.scheme}</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={quickToggle}
          disabled={pending}
          aria-label="toggle done"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
            item.done ? "border-light bg-light text-black" : "border-border text-muted active:scale-90"
          }`}
        >
          {item.done ? "✓" : ""}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface/40 px-4 py-4">
          <div className="mb-1.5 grid grid-cols-[1.5rem_1fr_1fr_1fr_1.75rem] items-center gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <span>#</span>
            <span className="text-center">Weight</span>
            <span className="text-center">Reps</span>
            <span className="text-center">RPE</span>
            <span />
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.75rem] items-center gap-2">
                <span className="text-center text-sm font-bold text-muted">{i + 1}</span>
                <NumberField value={r.weightKg} min={0} max={1000} onChange={(v) => update(i, { weightKg: round(v) })} />
                <NumberField value={r.reps} min={0} max={100} onChange={(v) => update(i, { reps: v })} />
                <NumberField value={r.rpe} min={1} max={10} onChange={(v) => update(i, { rpe: v })} />
                <button
                  type="button"
                  onClick={() => removeSet(i)}
                  aria-label="remove set"
                  className="flex h-9 w-7 items-center justify-center rounded-lg text-muted active:scale-90"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSet} className="btn-ghost mt-2.5 w-full text-sm">
            + Add set
          </button>

          <button type="button" className="btn-primary mt-3 w-full" disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save sets"}
          </button>

          {onSwap || onRemove ? (
            <div className="mt-2 flex gap-2">
              {onSwap ? (
                <button type="button" className="btn-ghost flex-1 text-sm" onClick={onSwap}>
                  Swap exercise
                </button>
              ) : null}
              {onRemove ? (
                <button type="button" className="btn-ghost flex-1 text-sm text-heavy" onClick={onRemove}>
                  Remove
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
