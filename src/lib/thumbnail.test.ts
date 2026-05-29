// ABOUTME: Tests for thumbnail generation — real sharp encode + thumbhash decode,
// ABOUTME: verifying a valid WebP card and a round-trippable placeholder hash.
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { thumbHashToRGBA } from "thumbhash";
import { makeThumbnail } from "./thumbnail";

// Build a tall, two-band PNG to stand in for a full-page screenshot.
async function fakeScreenshot(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1280,
      height: 4000,
      channels: 3,
      background: { r: 220, g: 40, b: 30 },
    },
  })
    .png()
    .toBuffer();
}

describe("makeThumbnail", () => {
  it("produces a valid WebP card at the expected dimensions", async () => {
    const png = await fakeScreenshot();
    const result = await makeThumbnail(png);

    const meta = await sharp(result.thumb).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(375);
    expect(result.width).toBe(600);
    expect(result.height).toBe(375);
  });

  it("emits a base64 thumbhash that decodes back to pixels", async () => {
    const png = await fakeScreenshot();
    const { thumbhash } = await makeThumbnail(png);

    expect(thumbhash).toMatch(/^[A-Za-z0-9+/=]+$/);
    const bytes = new Uint8Array(Buffer.from(thumbhash, "base64"));
    const { w, h, rgba } = thumbHashToRGBA(bytes);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    expect(rgba.length).toBe(w * h * 4);
  });
});
