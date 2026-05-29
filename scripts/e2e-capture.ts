// ABOUTME: End-to-end capture check — runs the real archive pipeline (Steel →
// ABOUTME: store → thumbnail → DB) against a live URL and asserts the artifacts.
// Requires Steel to be configured (STEEL_API_KEY or STEEL_BASE_URL). Run with:
//   npm run test:e2e -- https://example.com
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, snapshots } from "@/db/schema";
import { enqueueUrl, processSnapshot } from "@/lib/archive";
import { hasArtifact, readArtifact } from "@/lib/storage";
import { steelConfigured } from "@/lib/config";

async function main() {
  const url = process.argv[2] ?? "https://example.com";
  if (!steelConfigured()) {
    console.error("Steel not configured — set STEEL_API_KEY or STEEL_BASE_URL.");
    process.exit(1);
  }

  // enqueueUrl creates the page + first snapshot and queues it; capture it
  // synchronously here so we can assert the result.
  const page = enqueueUrl(url);
  const snap = db.select().from(snapshots).where(eq(snapshots.pageId, page.id)).get()!;
  const id = snap.id;
  console.log(`Capturing ${url} (page=${page.id} snapshot=${id})…`);

  await processSnapshot(id);

  const row = db.select().from(pages).where(eq(pages.id, page.id)).get()!;
  console.log("status:", row.status);
  if (row.status !== "done") {
    console.error("FAILED:", row.error);
    process.exit(1);
  }

  const checks: [string, boolean][] = [
    ["html artifact", hasArtifact(id, "html")],
    ["markdown artifact", hasArtifact(id, "markdown")],
    ["screenshot artifact", hasArtifact(id, "screenshot")],
    ["thumbnail artifact", hasArtifact(id, "thumbnail")],
    ["title set", Boolean(row.title)],
    ["thumbhash set", Boolean(row.thumbhash)],
    ["capturedAt set", Boolean(row.capturedAt)],
    ["latestSnapshotId set", row.latestSnapshotId === id],
  ];

  const shot = await readArtifact(id, "screenshot");
  const thumb = await readArtifact(id, "thumbnail");
  checks.push(["screenshot has bytes", (shot?.length ?? 0) > 0]);
  checks.push(["thumbnail has bytes", (thumb?.length ?? 0) > 0]);

  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`${pass ? "✓" : "✗"} ${name}`);
    if (!pass) ok = false;
  }
  console.log(`\ntitle: ${row.title}\nwords: ${row.wordCount}\nscreenshot: ${shot?.length} bytes  thumb: ${thumb?.length} bytes`);

  process.exit(ok ? 0 : 1);
}

main();
