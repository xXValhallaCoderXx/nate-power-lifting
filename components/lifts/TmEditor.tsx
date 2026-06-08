"use client";

import { useState, useTransition } from "react";
import { Stepper } from "@/components/Stepper";
import { setTrainingMax } from "@/lib/actions";
import { LIFT_NAMES, type LiftName } from "@/lib/program";

export function TmEditor({
  liftId,
  currentTm,
}: {
  liftId: LiftName;
  currentTm: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentTm ?? (liftId === "deadlift" || liftId === "squat" ? 100 : 60));
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("liftId", liftId);
    fd.set("newTm", String(value));
    startTransition(async () => {
      await setTrainingMax(fd);
      setOpen(false);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{LIFT_NAMES[liftId]}</div>
          <div className="text-3xl font-bold tabular-nums">
            {currentTm != null ? `${currentTm}` : "TBD"}
            <span className="ml-1 text-base font-normal text-muted">kg</span>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setOpen((o) => !o)}>
          {currentTm != null ? "Edit" : "Calibrate"}
        </button>
      </div>

      {open ? (
        <div className="mt-4">
          <Stepper label="Training Max" value={value} step={1.25} min={1} max={500} suffix="kg" onChange={setValue} />
          <button type="button" className="btn-primary mt-3 w-full" disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save Training Max"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
