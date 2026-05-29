// ABOUTME: Tests for schedule presets — validation and next-run computation.
import { describe, it, expect } from "vitest";
import { computeNextRun, isSchedule, SCHEDULE_MS } from "./schedule";

describe("isSchedule", () => {
  it("accepts known presets", () => {
    expect(isSchedule("off")).toBe(true);
    expect(isSchedule("daily")).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isSchedule("monthly")).toBe(false);
    expect(isSchedule("")).toBe(false);
  });
});

describe("computeNextRun", () => {
  const now = 1_700_000_000_000;

  it("returns null for off", () => {
    expect(computeNextRun("off", now)).toBeNull();
  });

  it("adds the hourly interval", () => {
    expect(computeNextRun("hourly", now)?.getTime()).toBe(now + SCHEDULE_MS.hourly);
  });

  it("adds the daily interval", () => {
    expect(computeNextRun("daily", now)?.getTime()).toBe(now + 24 * 60 * 60 * 1000);
  });

  it("adds the weekly interval", () => {
    expect(computeNextRun("weekly", now)?.getTime()).toBe(now + 7 * 24 * 60 * 60 * 1000);
  });
});
