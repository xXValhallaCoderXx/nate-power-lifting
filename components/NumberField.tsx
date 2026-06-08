"use client";

import { useEffect, useState } from "react";

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Compact, directly-editable numeric field with validation (no +/- buttons).
 * Used for dense grids like the accessory set editor.
 */
export function NumberField({
  value,
  min = 0,
  max = 9999,
  placeholder,
  onChange,
  className = "",
  compact = false,
  ariaLabel,
}: {
  value: number;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (v: number) => void;
  className?: string;
  /** Smaller font/padding for dense inline grids. */
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(String(round2(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(round2(value)));
  }, [value, focused]);

  const parsed = parseFloat(text);
  const invalid = text.trim() === "" || Number.isNaN(parsed) || parsed < min || parsed > max;

  function commit() {
    setFocused(false);
    let n = parseFloat(text);
    if (!Number.isFinite(n)) n = value;
    n = round2(clamp(n, min, max));
    onChange(n);
    setText(String(n));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={commit}
      size={1}
      className={`w-full min-w-0 rounded-xl border bg-surface2 text-center font-bold tabular-nums outline-none transition ${
        compact ? "px-0.5 py-2 text-base" : "py-2.5 text-lg"
      } ${invalid ? "border-heavy" : "border-border focus:border-accent focus:bg-surface"} ${className}`}
    />
  );
}
