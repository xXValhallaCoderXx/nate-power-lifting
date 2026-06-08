"use client";

import { useState, useTransition } from "react";
import { AccessoryRow } from "@/components/session/AccessoryRow";
import { ExercisePicker } from "@/components/session/ExercisePicker";
import { addAccessory, removeAccessory, swapAccessory } from "@/lib/actions";
import type { AccessoryItem, AccessorySet } from "@/db";

type PickerMode = { type: "add" } | { type: "swap"; id: number } | null;

export function AccessoryManager({
  items,
  setsByItem,
  sessionId,
  plateIncrement,
}: {
  items: AccessoryItem[];
  setsByItem: Record<number, AccessorySet[]>;
  sessionId: number;
  plateIncrement: number;
}) {
  const [mode, setMode] = useState<PickerMode>(null);
  const [, startTransition] = useTransition();

  function handlePick(name: string) {
    const current = mode;
    setMode(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("name", name);
      if (current?.type === "swap") {
        fd.set("id", String(current.id));
        await swapAccessory(fd);
      } else {
        await addAccessory(fd);
      }
    });
  }

  function handleRemove(id: number) {
    startTransition(async () => {
      await removeAccessory(id, sessionId);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <AccessoryRow
            key={a.id}
            item={a}
            sets={setsByItem[a.id] ?? []}
            plateIncrement={plateIncrement}
            onSwap={() => setMode({ type: "swap", id: a.id })}
            onRemove={() => handleRemove(a.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn-secondary mt-2 w-full text-sm"
        onClick={() => setMode({ type: "add" })}
      >
        + Add exercise
      </button>

      <ExercisePicker
        open={mode !== null}
        title={mode?.type === "swap" ? "Swap exercise" : "Add exercise"}
        onClose={() => setMode(null)}
        onPick={handlePick}
      />
    </>
  );
}
