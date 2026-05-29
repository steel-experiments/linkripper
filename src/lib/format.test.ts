// ABOUTME: Tests for presentation helpers — relative time and status mappings.
import { describe, it, expect } from "vitest";
import { relativeTime, STATUS_LABEL, STATUS_CLASS } from "./format";

describe("relativeTime", () => {
  it("returns empty string for null", () => {
    expect(relativeTime(null)).toBe("");
  });

  it("describes recent times in seconds", () => {
    expect(relativeTime(new Date(Date.now() - 5000))).toMatch(/s ago|just now/);
  });

  it("describes minutes ago", () => {
    expect(relativeTime(new Date(Date.now() - 5 * 60 * 1000))).toBe("5m ago");
  });

  it("describes hours ago", () => {
    expect(relativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe("3h ago");
  });
});

describe("status maps", () => {
  it("has a label and class for every status", () => {
    for (const status of ["pending", "processing", "done", "failed"] as const) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      expect(STATUS_CLASS[status]).toBeTruthy();
    }
  });
});
