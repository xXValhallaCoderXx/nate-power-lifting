"use client";

import { useEffect, useState } from "react";

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => String(round2(n));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function Stepper({
  label,
  value,
  step,
  min = 0,
  max = 9999,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);

  // Keep the input in sync with external changes (e.g. +/- buttons) unless the user is typing.
  useEffect(() => {
    if (!focused) setText(fmt(value));
  }, [value, focused]);

  const parsed = parseFloat(text);
  const invalid = text.trim() === "" || Number.isNaN(parsed) || parsed < min || parsed > max;

  function handleInput(raw: string) {
    setText(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(n); // live; clamped on blur
  }

  function commit() {
    setFocused(false);
    let n = parseFloat(text);
    if (!Number.isFinite(n)) n = value;
    n = round2(clamp(n, min, max));
    onChange(n);
    setText(fmt(n));
  }

  return (
    <div className="flex-1">
      <div className="mb-1 text-center text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(round2(clamp(value - step, min, max)))}
          aria-label={`decrease ${label}`}
        >
          -
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.target.select();
            }}
            onBlur={commit}
            aria-label={label}
            className={`w-full rounded-xl border bg-surface2 py-2 text-center text-2xl font-bold tabular-nums outline-none ${
              invalid ? "border-heavy" : "border-border focus:border-accent"
            }`}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(round2(clamp(value + step, min, max)))}
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
