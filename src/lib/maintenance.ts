// ABOUTME: Archive maintenance operations powering the settings page: storage
// ABOUTME: stats, failed-snapshot cleanup, orphan-blob pruning, VACUUM, and nuke.
import { sql, eq } from "drizzle-orm";
import { existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/db";
import { pages, snapshots, type CaptureStatus } from "@/db/schema";
import { config } from "./config";
import { pageDir, removePageBlobs } from "./storage";

const STATUSES: CaptureStatus[] = ["pending", "processing", "done", "failed"];

export interface StorageStats {
  pageCount: number;
  snapshotCount: number;
  // How many snapshots sit in each capture status.
  statusBreakdown: Record<CaptureStatus, number>;
  // On-disk size of the SQLite database (including WAL/shm sidecars).
  dbBytes: number;
  // Total size of every per-snapshot blob directory.
  blobBytes: number;
}

// Sum the size of a file, or a directory tree, returning 0 if it doesn't exist.
function pathBytes(path: string): number {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const entry of readdirSync(path)) total += pathBytes(join(path, entry));
  return total;
}

export function getStorageStats(): StorageStats {
  const pageCount = db.select().from(pages).all().length;
  const snaps = db.select({ status: snapshots.status }).from(snapshots).all();

  const statusBreakdown = Object.fromEntries(
    STATUSES.map((s) => [s, 0]),
  ) as Record<CaptureStatus, number>;
  for (const s of snaps) statusBreakdown[s.status] += 1;

  const dbBytes =
    pathBytes(config.databasePath) +
    pathBytes(`${config.databasePath}-wal`) +
    pathBytes(`${config.databasePath}-shm`);

  return {
    pageCount,
    snapshotCount: snaps.length,
    statusBreakdown,
    dbBytes,
    blobBytes: pathBytes(config.blobDir),
  };
}

// Delete every failed snapshot (rows + blobs). Pages are left in place so a
// failed page can still be retried or manually deleted from the grid.
export function removeFailedSnapshots(): number {
  const failed = db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.status, "failed"))
    .all();
  for (const s of failed) removePageBlobs(s.id);
  db.delete(snapshots).where(eq(snapshots.status, "failed")).run();
  return failed.length;
}

// Remove blob directories that no longer correspond to a snapshot row — leaked
// space from interrupted captures or out-of-band deletions.
export function pruneOrphanBlobs(): number {
  if (!existsSync(config.blobDir)) return 0;
  const known = new Set(db.select({ id: snapshots.id }).from(snapshots).all().map((s) => s.id));
  let removed = 0;
  for (const entry of readdirSync(config.blobDir)) {
    if (!known.has(entry)) {
      rmSync(pageDir(entry), { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

// Reclaim SQLite free pages and flush the WAL back into the main file.
export function vacuumDatabase(): void {
  db.run(sql`VACUUM`);
  db.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
}

// Wipe the entire archive: all rows and every blob. Settings are preserved.
export function nukeArchive(): void {
  db.delete(snapshots).run();
  db.delete(pages).run();
  rmSync(config.blobDir, { recursive: true, force: true });
}
