"use client";

import { useEffect, useRef, useState } from "react";

export interface ExerciseHit {
  id: string;
  name: string;
  equipment: string | null;
  category: string | null;
  primaryMuscles: string[];
}

export function ExercisePicker({
  open,
  title,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exercises?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as ExerciseHit[];
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancel
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 870+ exercises..."
            className="input"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)]">
          {loading && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Searching...</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No matches.</p>
          ) : (
            <ul className="flex flex-col gap-2 pb-6">
              {results.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onPick(ex.name)}
                    className="w-full rounded-xl border border-border bg-surface2 px-3 py-3 text-left"
                  >
                    <div className="font-medium">{ex.name}</div>
                    <div className="mt-0.5 text-xs capitalize text-muted">
                      {[ex.equipment, ex.primaryMuscles?.[0], ex.category].filter(Boolean).join(" - ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
