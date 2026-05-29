// ABOUTME: A single capture in the history timeline. Clicking it opens an in-place
// ABOUTME: menu (View / Set as default / Delete) — per-capture management without
// ABOUTME: a browser alert. Delete uses an inline two-step confirm.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Thumbnail } from "./Thumbnail";
import { promoteSnapshotAction, deleteSnapshotAction } from "@/app/actions";
import { STATUS_LABEL, STATUS_CLASS } from "@/lib/format";
import type { CaptureStatus, CaptureMode } from "@/db/schema";

export interface SnapshotCardProps {
  id: string;
  pageId: string;
  status: CaptureStatus;
  thumbhash: string | null;
  timeLabel: string;
  captureMode: CaptureMode | null;
  isDefault: boolean;
  isViewing: boolean;
  viewHref: string;
}

export function SnapshotCard(props: SnapshotCardProps) {
  const { id, pageId, status, thumbhash, timeLabel, captureMode, isDefault, isViewing, viewHref } = props;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  const done = status === "done";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`block overflow-hidden rounded-md border text-left ${isViewing ? "border-accent" : "border-ink-600"}`}
      >
        <div className="relative h-20 w-32 bg-ink-700">
          {done && thumbhash ? (
            <Thumbnail id={id} thumbhash={thumbhash} title="" className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
          )}
          {isDefault && (
            <span className="absolute left-1 top-1 rounded bg-accent px-1 py-0.5 text-[9px] font-bold uppercase text-ink-900">
              Default
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 px-2 py-1 text-[11px] text-zinc-400">
          <span>{timeLabel}</span>
          {captureMode && (
            <span className={captureMode === "advanced" ? "text-accent" : "text-zinc-500"}>
              {captureMode === "advanced" ? "⚡Steel" : "Basic"}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 top-0 z-20 flex h-20 w-32 flex-col justify-center gap-1 rounded-md border border-ink-500 bg-ink-900/95 p-2 text-xs shadow-lg">
          {!confirming ? (
            <>
              <button
                type="button"
                onClick={() => {
                  router.push(viewHref);
                  close();
                }}
                className="text-left text-zinc-200 hover:text-accent"
              >
                View capture
              </button>
              {done && !isDefault && (
                <form action={promoteSnapshotAction}>
                  <input type="hidden" name="snapshotId" value={id} />
                  <input type="hidden" name="pageId" value={pageId} />
                  <button type="submit" className="text-left text-zinc-200 hover:text-accent">
                    Set as default
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-left text-zinc-400 hover:text-red-300"
              >
                Delete capture
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300">Delete this capture?</span>
              <div className="flex items-center gap-3">
                <form action={deleteSnapshotAction}>
                  <input type="hidden" name="snapshotId" value={id} />
                  <input type="hidden" name="pageId" value={pageId} />
                  <button type="submit" className="font-semibold text-red-400 hover:text-red-300">
                    Yes
                  </button>
                </form>
                <button type="button" onClick={() => setConfirming(false)} className="text-zinc-400 hover:text-zinc-200">
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
