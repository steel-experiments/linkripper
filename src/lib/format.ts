// ABOUTME: Small presentation helpers shared across server components: relative
// ABOUTME: time formatting and status badge styling.
import type { CaptureStatus } from "@/db/schema";

export function relativeTime(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [size, label] of units) {
    if (Math.abs(value) < size) {
      unit = label;
      break;
    }
    value = Math.round(value / size);
    unit = label;
  }
  return value <= 0 ? "just now" : `${value}${unit} ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export const STATUS_LABEL: Record<CaptureStatus, string> = {
  pending: "Queued",
  processing: "Ripping…",
  done: "Archived",
  failed: "Failed",
};

export const STATUS_CLASS: Record<CaptureStatus, string> = {
  pending: "bg-zinc-700 text-zinc-300",
  processing: "bg-amber-500/20 text-amber-300",
  done: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
};
