"use client";

import { useState, useTransition } from "react";
import { Stepper } from "@/components/Stepper";
import { applyTmChange } from "@/lib/actions";
import { LIFT_NAMES, type TmProposal } from "@/lib/program";

export function TmProposalCard({ proposal }: { proposal: TmProposal }) {
  const [newTm, setNewTm] = useState(proposal.newTm);
  const [state, setState] = useState<"open" | "accepted" | "declined">("open");
  const [pending, startTransition] = useTransition();

  function accept() {
    const fd = new FormData();
    fd.set("liftId", proposal.lift);
    fd.set("newTm", String(newTm));
    fd.set("reason", newTm === proposal.newTm ? proposal.reason : "manual");
    fd.set("note", proposal.message);
    startTransition(async () => {
      await applyTmChange(fd);
      setState("accepted");
    });
  }

  if (state === "accepted") {
    return (
      <div className="card border-light/40">
        <p className="text-sm">
          <span className="font-semibold">{LIFT_NAMES[proposal.lift]}</span> TM set to{" "}
          <span className="font-bold text-light">{newTm} kg</span>.
        </p>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="card text-sm text-muted">
        <span className="font-semibold text-white">{LIFT_NAMES[proposal.lift]}</span> TM kept at{" "}
        {proposal.oldTm} kg.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{LIFT_NAMES[proposal.lift]}</h3>
        <span className="font-mono text-sm text-muted">
          {proposal.oldTm} {"->"} <span className="font-bold text-accent">{newTm} kg</span>
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">{proposal.message}</p>

      <div className="mb-3">
        <Stepper label="New Training Max" value={newTm} step={1.25} min={1} max={500} suffix="kg" onChange={setNewTm} />
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={pending} onClick={accept}>
          {pending ? "Saving..." : "Accept"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => setState("declined")}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
