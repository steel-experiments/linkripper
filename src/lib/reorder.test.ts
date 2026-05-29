// ABOUTME: Integration test for drag-to-rearrange persistence — reorderPages
// ABOUTME: against a real temporary SQLite DB, verified through listPages.
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let db: typeof import("@/db").db;
let pages: typeof import("@/db/schema").pages;
let reorderPages: typeof import("./archive").reorderPages;
let listPages: typeof import("./queries").listPages;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "linkripper-reorder-"));
  process.env.DATA_DIR = dir;
  process.env.DATABASE_PATH = join(dir, "test.db");
  ({ db } = await import("@/db"));
  ({ pages } = await import("@/db/schema"));
  ({ reorderPages } = await import("./archive"));
  ({ listPages } = await import("./queries"));

  // Seed three pages with ascending sort_order → initial order is c, b, a.
  db.insert(pages).values([
    { id: "a", url: "https://a.test", sortOrder: 1 },
    { id: "b", url: "https://b.test", sortOrder: 2 },
    { id: "c", url: "https://c.test", sortOrder: 3 },
  ]).run();
});

describe("reorderPages", () => {
  it("starts in descending sort_order", () => {
    expect(listPages().map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("persists a dragged order (top id sorts highest)", () => {
    reorderPages(["a", "b", "c"]);
    expect(listPages().map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("applies a subsequent reorder", () => {
    reorderPages(["b", "c", "a"]);
    expect(listPages().map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
});
