"use client";

import { useState, useTransition } from "react";
import { Stepper } from "@/components/Stepper";
import { updateSettings } from "@/lib/actions";

export function SettingsForm({
  bodyweight,
  plateIncrement,
}: {
  bodyweight: number | null;
  plateIncrement: number;
}) {
  const [bw, setBw] = useState(bodyweight ?? 70);
  const [inc, setInc] = useState(plateIncrement);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    const fd = new FormData();
    fd.set("bodyweight", String(bw));
    fd.set("plateIncrement", String(inc));
    startTransition(async () => {
      await updateSettings(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="card flex flex-col gap-4">
      <Stepper label="Bodyweight" value={bw} step={0.5} min={20} max={300} suffix="kg" onChange={setBw} />

      <div>
        <div className="label">Plate increment</div>
        <div className="flex gap-2">
          {[2.5, 1.25].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInc(v)}
              className={`flex-1 rounded-xl border px-3 py-3 font-semibold ${
                inc === v ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface2 text-muted"
              }`}
            >
              {v} kg
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn-primary" disabled={pending} onClick={save}>
        {pending ? "Saving..." : saved ? "Saved" : "Save settings"}
      </button>
    </div>
  );
}
