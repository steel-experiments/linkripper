// ABOUTME: Delete control with an inline, in-app confirmation step (no browser
// ABOUTME: alert). First click reveals Yes/No; only "Yes" submits the deletion.
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAction } from "@/app/actions";

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="font-semibold text-red-400 hover:text-red-300 disabled:opacity-50">
      {pending ? "Deleting…" : "Yes"}
    </button>
  );
}

export function DeleteButton({ pageId, label }: { pageId: string; label?: string }) {
  const [confirming, setConfirming] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Dismiss the confirmation on outside click or Escape, so it never gets stuck.
  useEffect(() => {
    if (!confirming) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setConfirming(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirming(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirming]);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs text-zinc-500 hover:text-red-300">
        {label ?? "Delete"}
      </button>
    );
  }

  return (
    <span ref={wrapRef} className="inline-flex items-center gap-2 text-xs">
      <span className="text-zinc-400">Delete?</span>
      <form action={deleteAction} className="inline">
        <input type="hidden" name="pageId" value={pageId} />
        <ConfirmSubmit />
      </form>
      <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:text-zinc-300">
        No
      </button>
    </span>
  );
}
