// ABOUTME: Nav-bar switch toggling the global capture mode between Basic (naive
// ABOUTME: Steel one-shot) and Advanced (full Steel session powers). Drives the demo.
"use client";

import { useTransition } from "react";
import { setCaptureModeAction } from "@/app/actions";
import type { CaptureMode } from "@/db/schema";

export function CaptureModeToggle({ mode }: { mode: CaptureMode }) {
  const [pending, startTransition] = useTransition();
  const advanced = mode === "advanced";

  function toggle() {
    const fd = new FormData();
    fd.set("mode", advanced ? "basic" : "advanced");
    startTransition(() => setCaptureModeAction(fd));
  }

  return (
    <div className="flex items-center gap-2" title="Capture mode for new captures — flip to compare basic vs. advanced Steel">
      <span className={`text-xs font-medium ${advanced ? "text-accent" : "text-zinc-500"}`}>
        {advanced ? "⚡ Steel Advanced" : "Basic mode"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={advanced}
        aria-label="Toggle advanced Steel capture mode"
        onClick={toggle}
        disabled={pending}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          advanced ? "bg-accent" : "bg-ink-600"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            advanced ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
