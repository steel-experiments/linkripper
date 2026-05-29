// ABOUTME: Tests for URL normalization — scheme inference and validation.
import { describe, it, expect } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("keeps a valid https URL", () => {
    expect(normalizeUrl("https://example.com/article")).toBe("https://example.com/article");
  });

  it("adds https:// to a bare hostname", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeUrl("  example.com/x  ")).toBe("https://example.com/x");
  });

  it("preserves an explicit http:// scheme", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("rejects non-http(s) schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
  });
});
