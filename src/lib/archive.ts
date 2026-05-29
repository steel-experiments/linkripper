// ABOUTME: The archive pipeline. Each capture is a snapshot: capture via Steel,
// ABOUTME: persist artifacts under the snapshot id, build a thumbnail, then update
// ABOUTME: the snapshot row and denormalize the latest result onto its page.
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { pages, snapshots, type Page } from "@/db/schema";
import { capturePage } from "./steel";
import { makeThumbnail } from "./thumbnail";
import { writeArtifact } from "./storage";
import { captureQueue } from "./queue";
import { computeNextRun } from "./schedule";
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

  try {
    const captured = await capturePage(page.url);

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
