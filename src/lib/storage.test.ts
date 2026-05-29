// ABOUTME: Tests for filesystem blob storage — write/read/has/remove round-trips
// ABOUTME: against a temporary data dir set via DATA_DIR before module load.
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// storage reads config (DATA_DIR) at import time, so set it up first and load lazily.
let storage: typeof import("./storage");

beforeAll(async () => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "linkripper-test-"));
  storage = await import("./storage");
});

describe("blob storage", () => {
  it("writes and reads a text artifact", async () => {
    await storage.writeArtifact("abc123", "markdown", "# hello");
    const back = await storage.readArtifact("abc123", "markdown");
    expect(back?.toString("utf-8")).toBe("# hello");
  });

  it("writes and reads a binary artifact", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await storage.writeArtifact("abc123", "screenshot", bytes);
    const back = await storage.readArtifact("abc123", "screenshot");
    expect(back?.equals(bytes)).toBe(true);
  });

  it("reports artifact presence", async () => {
    expect(storage.hasArtifact("abc123", "markdown")).toBe(true);
    expect(storage.hasArtifact("nope", "markdown")).toBe(false);
  });

  it("returns null for a missing artifact", async () => {
    expect(await storage.readArtifact("missing", "html")).toBeNull();
  });

  it("removes all blobs for a page", async () => {
    storage.removePageBlobs("abc123");
    expect(storage.hasArtifact("abc123", "markdown")).toBe(false);
    expect(storage.hasArtifact("abc123", "screenshot")).toBe(false);
  });
});
