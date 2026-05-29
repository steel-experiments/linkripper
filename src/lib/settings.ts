// ABOUTME: Global app settings backed by the `settings` table. Currently just the
// ABOUTME: capture mode (basic vs advanced), read by the background capture pipeline.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type CaptureMode } from "@/db/schema";

const CAPTURE_MODE_KEY = "captureMode";

// Advanced is the default so the app showcases Steel's full powers out of the box.
export function getCaptureMode(): CaptureMode {
  const row = db.select().from(settings).where(eq(settings.key, CAPTURE_MODE_KEY)).get();
  return row?.value === "basic" ? "basic" : "advanced";
}

export function setCaptureMode(mode: CaptureMode): void {
  db.insert(settings)
    .values({ key: CAPTURE_MODE_KEY, value: mode })
    .onConflictDoUpdate({ target: settings.key, set: { value: mode } })
    .run();
}
