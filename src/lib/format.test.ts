// ABOUTME: Tests for presentation helpers — relative time and status mappings.
import { describe, it, expect } from "vitest";
import { relativeTime, formatBytes, STATUS_LABEL, STATUS_CLASS } from "./format";

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

describe("formatBytes", () => {
  it("keeps sub-kilobyte values in bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("scales to KB/MB/GB with one decimal under 10", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
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
