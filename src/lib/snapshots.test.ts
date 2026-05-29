// ABOUTME: Integration tests for per-capture management — promoteSnapshot and
// ABOUTME: deleteSnapshot, including the page-display recompute edge cases.
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";

let db: typeof import("@/db").db;
let pages: typeof import("@/db/schema").pages;
let snapshots: typeof import("@/db/schema").snapshots;
let promoteSnapshot: typeof import("./archive").promoteSnapshot;
let deleteSnapshot: typeof import("./archive").deleteSnapshot;

function page() {
  return db.select().from(pages).where(eq(pages.id, "P")).get();
}

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "linkripper-snaps-"));
  process.env.DATA_DIR = dir;
  process.env.DATABASE_PATH = join(dir, "test.db");
  ({ db } = await import("@/db"));
  ({ pages, snapshots } = await import("@/db/schema"));
  ({ promoteSnapshot, deleteSnapshot } = await import("./archive"));

  db.insert(pages).values({ id: "P", url: "https://p.test", status: "done", latestSnapshotId: "s3", title: "T3" }).run();
  // Three done captures, oldest → newest.
  db.insert(snapshots).values([
    { id: "s1", pageId: "P", status: "done", title: "T1", thumbhash: "h1", createdAt: new Date(1000) },
    { id: "s2", pageId: "P", status: "done", title: "T2", thumbhash: "h2", createdAt: new Date(2000) },
    { id: "s3", pageId: "P", status: "done", title: "T3", thumbhash: "h3", createdAt: new Date(3000) },
  ]).run();
});

describe("promoteSnapshot", () => {
  it("makes a chosen capture the page default and copies its display fields", () => {
    promoteSnapshot("s1");
    expect(page()?.latestSnapshotId).toBe("s1");
    expect(page()?.title).toBe("T1");
  });
});

describe("deleteSnapshot", () => {
  it("preserves the manual default when deleting a different capture", () => {
    deleteSnapshot("s2"); // s1 is the promoted default and survives
    expect(page()?.latestSnapshotId).toBe("s1");
    expect(page()?.title).toBe("T1");
    expect(db.select().from(snapshots).where(eq(snapshots.id, "s2")).get()).toBeUndefined();
  });

  it("re-picks the newest done capture when the default itself is deleted", () => {
    deleteSnapshot("s1"); // default gone → fall back to newest remaining done (s3)
    expect(page()?.latestSnapshotId).toBe("s3");
    expect(page()?.title).toBe("T3");
  });

  it("deletes the page when its last capture is removed", () => {
    deleteSnapshot("s3");
    expect(page()).toBeUndefined();
  });
});
