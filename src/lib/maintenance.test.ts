// ABOUTME: Tests for archive maintenance — storage stats, failed-snapshot cleanup,
// ABOUTME: orphan-blob pruning, and the full nuke, against a temporary data dir.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The db/config/storage modules read DATA_DIR and cache a connection at import
// time, so each test points at a fresh dir and resets the module + global cache.
let maintenance: typeof import("./maintenance");
let storage: typeof import("./storage");
let config: typeof import("./config");
let dbmod: typeof import("@/db");
let schema: typeof import("@/db/schema");

beforeEach(async () => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "linkripper-maint-"));
  vi.resetModules();
  // The db singleton is cached on globalThis outside production; drop it so the
  // re-imported module opens SQLite at the new DATA_DIR.
  delete (globalThis as { __linkripperDb?: unknown }).__linkripperDb;
  schema = await import("@/db/schema");
  dbmod = await import("@/db");
  config = await import("./config");
  storage = await import("./storage");
  maintenance = await import("./maintenance");
});

// Seed one page + one snapshot with a blob dir.
async function seedSnapshot(
  pageId: string,
  snapId: string,
  status: import("@/db/schema").CaptureStatus,
) {
  dbmod.db.insert(schema.pages).values({ id: pageId, url: `https://x/${pageId}`, status }).run();
  dbmod.db.insert(schema.snapshots).values({ id: snapId, pageId, status }).run();
  await storage.writeArtifact(snapId, "markdown", `# ${snapId}`);
}

describe("getStorageStats", () => {
  it("counts pages, snapshots, and a status breakdown", async () => {
    await seedSnapshot("p1", "s1", "done");
    await seedSnapshot("p2", "s2", "failed");
    const stats = maintenance.getStorageStats();
    expect(stats.pageCount).toBe(2);
    expect(stats.snapshotCount).toBe(2);
    expect(stats.statusBreakdown.done).toBe(1);
    expect(stats.statusBreakdown.failed).toBe(1);
    expect(stats.dbBytes).toBeGreaterThan(0);
    expect(stats.blobBytes).toBeGreaterThan(0);
  });
});

describe("removeFailedSnapshots", () => {
  it("deletes failed snapshot rows and their blobs, keeps the rest", async () => {
    await seedSnapshot("p1", "s1", "done");
    await seedSnapshot("p2", "s2", "failed");
    const removed = maintenance.removeFailedSnapshots();
    expect(removed).toBe(1);
    expect(storage.hasArtifact("s1", "markdown")).toBe(true);
    expect(storage.hasArtifact("s2", "markdown")).toBe(false);
    const left = dbmod.db.select().from(schema.snapshots).all();
    expect(left.map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("pruneOrphanBlobs", () => {
  it("removes blob dirs with no matching snapshot row, leaves valid ones", async () => {
    await seedSnapshot("p1", "s1", "done");
    // An orphan dir with no DB row.
    mkdirSync(storage.pageDir("ghost"), { recursive: true });
    await storage.writeArtifact("ghost", "markdown", "boo");
    const removed = maintenance.pruneOrphanBlobs();
    expect(removed).toBe(1);
    expect(storage.hasArtifact("s1", "markdown")).toBe(true);
    expect(existsSync(storage.pageDir("ghost"))).toBe(false);
  });
});

describe("vacuumDatabase", () => {
  it("runs without throwing and leaves data intact", async () => {
    await seedSnapshot("p1", "s1", "done");
    expect(() => maintenance.vacuumDatabase()).not.toThrow();
    expect(dbmod.db.select().from(schema.pages).all()).toHaveLength(1);
  });
});

describe("nukeArchive", () => {
  it("removes every page, snapshot, and blob", async () => {
    await seedSnapshot("p1", "s1", "done");
    await seedSnapshot("p2", "s2", "failed");
    maintenance.nukeArchive();
    expect(dbmod.db.select().from(schema.pages).all()).toHaveLength(0);
    expect(dbmod.db.select().from(schema.snapshots).all()).toHaveLength(0);
    expect(storage.hasArtifact("s1", "markdown")).toBe(false);
    expect(storage.hasArtifact("s2", "markdown")).toBe(false);
    // Blob root is emptied (recreated lazily on next write).
    const entries = existsSync(config.config.blobDir) ? readdirSync(config.config.blobDir) : [];
    expect(entries).toHaveLength(0);
  });
});
