"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSession, cancelSession } from "@/lib/actions";

export function SessionControls({ sessionId, loggedCount }: { sessionId: number; loggedCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function finish() {
    startTransition(async () => {
      await completeSession(sessionId);
      router.push(`/session/${sessionId}/complete`);
    });
  }

  function cancel() {
    if (!confirm("Discard this session and everything logged in it?")) return;
    startTransition(async () => {
      await cancelSession(sessionId);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn-primary w-full text-lg" disabled={pending} onClick={finish}>
        {pending ? "Finishing..." : `Finish Session${loggedCount ? ` (${loggedCount} sets)` : ""}`}
      </button>
      <button type="button" className="btn-secondary w-full text-sm text-muted" disabled={pending} onClick={cancel}>
        Discard session
      </button>
    </div>
  );
}
