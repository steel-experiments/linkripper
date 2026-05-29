// ABOUTME: Dropdown to set a page's recurring capture schedule. Submits the
// ABOUTME: setSchedule server action immediately on change.
"use client";

import { useRef } from "react";
import { setScheduleAction } from "@/app/actions";
import { SCHEDULE_OPTIONS, SCHEDULE_LABEL } from "@/lib/schedule";
import type { Schedule } from "@/db/schema";

export function ScheduleSelect({ pageId, value }: { pageId: string; value: Schedule }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setScheduleAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="pageId" value={pageId} />
      <label className="text-xs text-zinc-500">Re-capture</label>
      <select
        name="schedule"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-sm text-zinc-200 focus:border-accent focus:outline-none"
      >
        {SCHEDULE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SCHEDULE_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
