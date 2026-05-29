// ABOUTME: The archive pipeline. Each capture is a snapshot: capture via Steel,
// ABOUTME: persist artifacts under the snapshot id, build a thumbnail, then update
// ABOUTME: the snapshot row and denormalize the latest result onto its page.
import { eq, sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { pages, snapshots, type Page, type Snapshot } from "@/db/schema";
import { removePageBlobs } from "./storage";
import { capturePage } from "./steel";
import { makeThumbnail } from "./thumbnail";
import { writeArtifact } from "./storage";
import { captureQueue } from "./queue";
import { computeNextRun } from "./schedule";
import { getCaptureMode } from "./settings";
import type { Schedule } from "@/db/schema";

function countWords(markdown: string): number {
  const words = markdown.trim().match(/\S+/g);
  return words ? words.length : 0;
}

// Run the full capture for one snapshot id. Records failure on both the snapshot
// and its page instead of throwing, so a bad URL never takes down the queue.
export async function processSnapshot(snapshotId: string): Promise<void> {
  const snap = db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  if (!snap) return;

  db.update(snapshots).set({ status: "processing", error: null }).where(eq(snapshots.id, snapshotId)).run();
  db.update(pages).set({ status: "processing", error: null }).where(eq(pages.id, snap.pageId)).run();

  const page = db.select().from(pages).where(eq(pages.id, snap.pageId)).get();
  if (!page) return;

  // Capture mode is read at capture time so the nav toggle affects new captures.
  const mode = getCaptureMode();
  db.update(snapshots).set({ captureMode: mode }).where(eq(snapshots.id, snapshotId)).run();

  try {
    const captured = await capturePage(page.url, mode);

    await writeArtifact(snapshotId, "html", captured.html);
    await writeArtifact(snapshotId, "markdown", captured.markdown);
    await writeArtifact(snapshotId, "screenshot", captured.screenshot);

    const thumb = await makeThumbnail(captured.screenshot);
    await writeArtifact(snapshotId, "thumbnail", thumb.thumb);

    const display = {
      title: captured.metadata.title ?? page.url,
      description: captured.metadata.description ?? null,
      siteName: captured.metadata.siteName ?? null,
      favicon: captured.metadata.favicon ?? null,
      author: captured.metadata.author ?? null,
      wordCount: countWords(captured.markdown),
      thumbhash: thumb.thumbhash,
      thumbW: thumb.width,
      thumbH: thumb.height,
      capturedAt: new Date(),
    };

    db.update(snapshots).set({ status: "done", error: null, ...display }).where(eq(snapshots.id, snapshotId)).run();
    db.update(pages)
      .set({ status: "done", error: null, latestSnapshotId: snapshotId, ...display })
      .where(eq(pages.id, page.id))
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.update(snapshots).set({ status: "failed", error: message }).where(eq(snapshots.id, snapshotId)).run();
    db.update(pages).set({ status: "failed", error: message }).where(eq(pages.id, page.id)).run();
  }
}

// Create a new pending snapshot for an existing page and enqueue its capture.
export function createSnapshot(pageId: string): string {
  const id = nanoid(12);
  db.insert(snapshots).values({ id, pageId, status: "pending" }).run();
  db.update(pages).set({ status: "pending", error: null }).where(eq(pages.id, pageId)).run();
  captureQueue.add(() => processSnapshot(id));
  return id;
}

// Create a page for a URL plus its first snapshot, and enqueue the capture.
// New pages get the highest sort_order so they land at the top of the grid.
export function enqueueUrl(url: string): Page {
  const id = nanoid(12);
  const top = db.select({ max: sql<number>`COALESCE(MAX(${pages.sortOrder}), 0)` }).from(pages).get();
  db.insert(pages).values({ id, url, status: "pending", sortOrder: (top?.max ?? 0) + 1 }).run();
  createSnapshot(id);
  return db.select().from(pages).where(eq(pages.id, id)).get()!;
}

// Persist a manual ordering of pages. `orderedIds` is the desired visual order
// (top first); we assign descending sort_order so the first id sorts highest.
export function reorderPages(orderedIds: string[]): void {
  db.transaction((tx) => {
    const n = orderedIds.length;
    orderedIds.forEach((id, index) => {
      tx.update(pages).set({ sortOrder: n - index }).where(eq(pages.id, id)).run();
    });
  });
}

// Re-run an existing snapshot (e.g. after a failure), overwriting its artifacts.
export function retrySnapshot(snapshotId: string): void {
  const snap = db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  if (!snap) return;
  db.update(snapshots).set({ status: "pending", error: null }).where(eq(snapshots.id, snapshotId)).run();
  db.update(pages).set({ status: "pending", error: null }).where(eq(pages.id, snap.pageId)).run();
  captureQueue.add(() => processSnapshot(snapshotId));
}

// Update a page's recurring schedule and compute its next run time.
export function setSchedule(pageId: string, schedule: Schedule, now: number): void {
  db.update(pages)
    .set({ schedule, nextRunAt: computeNextRun(schedule, now) })
    .where(eq(pages.id, pageId))
    .run();
}

// Copy a snapshot's display fields onto its page (used when a snapshot becomes
// the page's current/displayed capture). The `status` argument lets callers keep
// an in-flight status rather than forcing "done".
function applySnapshotToPage(pageId: string, snap: Snapshot, status: Page["status"]): void {
  db.update(pages)
    .set({
      latestSnapshotId: snap.id,
      status,
      error: status === "failed" ? snap.error : null,
      title: snap.title,
      description: snap.description,
      siteName: snap.siteName,
      favicon: snap.favicon,
      author: snap.author,
      wordCount: snap.wordCount,
      thumbhash: snap.thumbhash,
      thumbW: snap.thumbW,
      thumbH: snap.thumbH,
      capturedAt: snap.capturedAt,
    })
    .where(eq(pages.id, pageId))
    .run();
}

// Recompute a page's denormalized display fields from its remaining snapshots.
// Keeps the current (possibly manually promoted) default if it still exists;
// otherwise falls back to the most recent DONE snapshot. Status tracks the newest.
function recomputePageDisplay(pageId: string): void {
  const page = db.select().from(pages).where(eq(pages.id, pageId)).get();
  const remaining = db
    .select()
    .from(snapshots)
    .where(eq(snapshots.pageId, pageId))
    .orderBy(desc(snapshots.createdAt))
    .all();

  if (remaining.length === 0) {
    // No captures left — the page is gone.
    db.delete(pages).where(eq(pages.id, pageId)).run();
    return;
  }

  const newest = remaining[0];
  // Preserve the current default if it survived; only re-pick when it's gone.
  const currentDefault = remaining.find((s) => s.id === page?.latestSnapshotId && s.status === "done");
  const chosen = currentDefault ?? remaining.find((s) => s.status === "done");
  if (chosen) {
    applySnapshotToPage(pageId, chosen, newest.status);
  } else {
    // Nothing successful to display; clear the card and reflect the newest status.
    db.update(pages)
      .set({
        latestSnapshotId: null,
        status: newest.status,
        error: newest.error,
        title: null,
        description: null,
        siteName: null,
        favicon: null,
        author: null,
        wordCount: null,
        thumbhash: null,
        thumbW: null,
        thumbH: null,
        capturedAt: null,
      })
      .where(eq(pages.id, pageId))
      .run();
  }
}

// Make a (done) snapshot the page's displayed/default capture.
export function promoteSnapshot(snapshotId: string): void {
  const snap = db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  if (!snap || snap.status !== "done") return;
  applySnapshotToPage(snap.pageId, snap, "done");
}

// Delete a single capture: remove its blobs and row, then recompute the page's
// displayed capture (deleting the page entirely if it was the last one).
export function deleteSnapshot(snapshotId: string): void {
  const snap = db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  if (!snap) return;
  removePageBlobs(snapshotId); // blobs are keyed by snapshot id
  db.delete(snapshots).where(eq(snapshots.id, snapshotId)).run();
  recomputePageDisplay(snap.pageId);
}
