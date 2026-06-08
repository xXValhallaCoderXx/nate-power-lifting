"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-accent2 shadow-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={2.4} strokeLinecap="round">
            <path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Lift Tracker</h1>
        <p className="mt-1 text-muted">Program-aware powerlifting log</p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="input"
            placeholder="Enter your password"
          />
        </div>

        {state?.error ? <p className="text-sm text-heavy">{state.error}</p> : null}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
