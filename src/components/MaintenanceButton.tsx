// ABOUTME: Confirm-then-run button for settings maintenance actions. Reuses the
// ABOUTME: inline Yes/No pattern; pass `confirmWord` for a type-to-confirm guard.
"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export function MaintenanceButton({
  action,
  label,
  pendingLabel,
  confirmWord,
  danger = false,
}: {
  action: () => Promise<void>;
  label: string;
  pendingLabel?: string;
  confirmWord?: string;
  danger?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  function reset() {
    setConfirming(false);
    setTyped("");
  }

  // Dismiss confirmation on outside click or Escape so it never gets stuck.
  useEffect(() => {
    if (!confirming) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) reset();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && reset();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirming]);

  function run() {
    startTransition(async () => {
      await action();
      reset();
    });
  }

  const base = danger
    ? "border-red-500/50 text-red-300 hover:bg-red-500/10"
    : "border-ink-600 text-zinc-300 hover:bg-ink-600/40";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${base}`}
      >
        {label}
      </button>
    );
  }

  const blocked = Boolean(confirmWord) && typed !== confirmWord;

  return (
    <div ref={wrapRef} className="flex flex-wrap items-center gap-2">
      {confirmWord && (
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={`Type ${confirmWord}`}
          aria-label={`Type ${confirmWord} to confirm`}
          className="w-32 rounded-md border border-red-500/50 bg-transparent px-2 py-1 text-sm text-red-200 placeholder:text-zinc-600 focus:outline-none"
        />
      )}
      {!confirmWord && <span className="text-sm text-zinc-400">Sure?</span>}
      <button
        type="button"
        onClick={run}
        disabled={pending || blocked}
        className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
          danger
            ? "border-red-500 bg-red-500/15 text-red-300 hover:bg-red-500/25"
            : "border-accent/60 text-accent hover:bg-accent/10"
        }`}
      >
        {pending ? (pendingLabel ?? "Working…") : "Confirm"}
      </button>
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}
