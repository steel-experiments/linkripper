// ABOUTME: Server Actions for mutating the archive: add a URL, capture now, set a
// ABOUTME: schedule, retry a failed snapshot, and delete a page (rows + all blobs).
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, snapshots } from "@/db/schema";
import { enqueueUrl, retrySnapshot, createSnapshot, setSchedule, reorderPages } from "@/lib/archive";
import { removePageBlobs } from "@/lib/storage";
import { steelConfigured } from "@/lib/config";
import { normalizeUrl } from "@/lib/url";
import { isSchedule } from "@/lib/schedule";

export async function addUrlAction(formData: FormData): Promise<void> {
  if (!steelConfigured()) {
    throw new Error("Steel is not configured — set STEEL_API_KEY or STEEL_BASE_URL.");
  }
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!url) throw new Error("Please enter a valid URL.");
  enqueueUrl(url);
  revalidatePath("/");
}

export async function captureNowAction(formData: FormData): Promise<void> {
  const pageId = String(formData.get("pageId") ?? "");
  if (!pageId) return;
  createSnapshot(pageId);
  revalidatePath("/");
  revalidatePath(`/archive/${pageId}`);
}

export async function setScheduleAction(formData: FormData): Promise<void> {
  const pageId = String(formData.get("pageId") ?? "");
  const schedule = String(formData.get("schedule") ?? "");
  if (!pageId || !isSchedule(schedule)) return;
  setSchedule(pageId, schedule, Date.now());
  revalidatePath("/");
  revalidatePath(`/archive/${pageId}`);
}

export async function reorderAction(orderedIds: string[]): Promise<void> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  reorderPages(orderedIds);
  revalidatePath("/");
}

export async function retryAction(formData: FormData): Promise<void> {
  const snapshotId = String(formData.get("snapshotId") ?? "");
  if (!snapshotId) return;
  retrySnapshot(snapshotId);
  revalidatePath("/");
}

export async function deleteAction(formData: FormData): Promise<void> {
  const pageId = String(formData.get("pageId") ?? "");
  if (!pageId) return;
  // Remove every snapshot's blob directory, then delete the page (snapshots
  // cascade via the FK).
  const snaps = db.select({ id: snapshots.id }).from(snapshots).where(eq(snapshots.pageId, pageId)).all();
  for (const s of snaps) removePageBlobs(s.id);
  db.delete(pages).where(eq(pages.id, pageId)).run();
  revalidatePath("/");
}
