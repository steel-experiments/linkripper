// ABOUTME: Schedule presets for recurring captures — the interval table and the
// ABOUTME: next-run computation shared by the actions and the scheduler.
import type { Schedule } from "@/db/schema";

// Interval in milliseconds for each preset. "off" has no interval.
export const SCHEDULE_MS: Record<Exclude<Schedule, "off">, number> = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export const SCHEDULE_LABEL: Record<Schedule, string> = {
  off: "Off",
  hourly: "Every hour",
  every6h: "Every 6 hours",
  daily: "Daily",
  weekly: "Weekly",
};

export const SCHEDULE_OPTIONS: Schedule[] = ["off", "hourly", "every6h", "daily", "weekly"];

export function isSchedule(value: string): value is Schedule {
  return (SCHEDULE_OPTIONS as string[]).includes(value);
}

// When should the next run fire, given a schedule and a starting point?
// Returns null for "off". `from` defaults to now (passed in for testability).
export function computeNextRun(schedule: Schedule, from: number): Date | null {
  if (schedule === "off") return null;
  return new Date(from + SCHEDULE_MS[schedule]);
}
