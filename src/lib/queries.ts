// ABOUTME: Read helpers for the UI — list pages for the grid/list and load a
// ABOUTME: single page together with its snapshot history.
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, snapshots, type Page, type Snapshot } from "@/db/schema";

export function listPages(): Page[] {
  // Manual sort order first (drag-to-rearrange), created_at as a stable tiebreak.
  return db.select().from(pages).orderBy(desc(pages.sortOrder), desc(pages.createdAt)).all();
}

export function getPage(pageId: string): Page | undefined {
  return db.select().from(pages).where(eq(pages.id, pageId)).get();
}

export function listSnapshots(pageId: string): Snapshot[] {
  return db
    .select()
    .from(snapshots)
    .where(eq(snapshots.pageId, pageId))
    .orderBy(desc(snapshots.createdAt))
    .all();
}

export function getSnapshot(snapshotId: string): Snapshot | undefined {
  return db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
}

// Any capture currently queued or running? Drives the home page auto-refresh.
export function hasInFlight(items: Page[]): boolean {
  return items.some((p) => p.status === "pending" || p.status === "processing");
}
