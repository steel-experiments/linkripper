// ABOUTME: In-process scheduler that periodically fires due recurring captures.
// ABOUTME: No external cron/queue — a single interval ticks and enqueues snapshots.
import { and, eq, lte, ne, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { createSnapshot } from "./archive";
import { computeNextRun } from "./schedule";

const TICK_MS = 30 * 1000;

// Find pages whose next run is due, advance their schedule, and enqueue a capture
// (skipping pages whose previous capture is still in flight to avoid pile-ups).
function tick(): void {
  const now = Date.now();
  const due = db
    .select()
    .from(pages)
    .where(and(ne(pages.schedule, "off"), isNotNull(pages.nextRunAt), lte(pages.nextRunAt, new Date(now))))
    .all();

  for (const page of due) {
    db.update(pages)
      .set({ nextRunAt: computeNextRun(page.schedule, now) })
      .where(eq(pages.id, page.id))
      .run();

    const inFlight = page.status === "pending" || page.status === "processing";
    if (!inFlight) createSnapshot(page.id);
  }
}

// Start the ticking loop once per process (survives Next.js hot reloads).
const globalForScheduler = globalThis as unknown as { __linkripperScheduler?: NodeJS.Timeout };

export function startScheduler(): void {
  if (globalForScheduler.__linkripperScheduler) return;
  globalForScheduler.__linkripperScheduler = setInterval(() => {
    try {
      tick();
    } catch (err) {
      console.error("[scheduler] tick failed:", err);
    }
  }, TICK_MS);
  console.log("[scheduler] started");
}
