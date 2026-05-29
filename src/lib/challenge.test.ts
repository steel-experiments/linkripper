// ABOUTME: Tests for Cloudflare/Turnstile challenge detection heuristics that
// ABOUTME: decide when to escalate from one-shot scrape to a solveCaptcha session.
import { describe, it, expect } from "vitest";
import { looksLikeChallenge } from "./steel";

describe("looksLikeChallenge", () => {
  it("detects the 'Just a moment' interstitial title", () => {
    expect(looksLikeChallenge("<html></html>", "Just a moment...")).toBe(true);
  });

  it("detects the cloudflare challenge platform script", () => {
    expect(
      looksLikeChallenge('<script src="/cdn-cgi/challenge-platform/h/b/orchestrate"></script>'),
    ).toBe(true);
  });

  it("detects a Turnstile widget", () => {
    expect(looksLikeChallenge('<div class="cf-turnstile"></div>')).toBe(true);
  });

  it("treats a normal article page as not a challenge", () => {
    expect(looksLikeChallenge("<html><body><h1>Hello world</h1></body></html>", "My Blog Post", 200)).toBe(false);
  });

  it("does not flag a plain 403 without cloudflare markers", () => {
    expect(looksLikeChallenge("<h1>Forbidden</h1>", "403 Forbidden", 403)).toBe(false);
  });
});
