// ABOUTME: Turns a full-page screenshot PNG into a top-cropped WebP card
// ABOUTME: thumbnail plus a tiny thumbhash placeholder for instant rendering.
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

// Card geometry. Full-page screenshots are very tall, so we anchor the crop to
// the TOP — the part of the page a person actually recognizes.
const CARD_W = 600;
const ASPECT = 16 / 10;
const CARD_H = Math.round(CARD_W / ASPECT);

export interface ThumbnailResult {
  thumb: Buffer; // WebP card image
  thumbhash: string; // base64 of thumbhash bytes, stored on the DB row
  width: number;
  height: number;
}

export async function makeThumbnail(pngBuffer: Buffer): Promise<ThumbnailResult> {
  // One source decode → top-anchored cover crop → WebP. `fit: cover` +
  // `position: top` does the top-crop-to-aspect-ratio in a single call.
  const thumb = await sharp(pngBuffer)
    .resize(CARD_W, CARD_H, { fit: "cover", position: "top" })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();

  // thumbhash wants small raw RGBA (≤100px). Downscale to the same crop first.
  const PH_W = 100;
  const PH_H = Math.round(PH_W / ASPECT);
  const { data, info } = await sharp(pngBuffer)
    .resize(PH_W, PH_H, { fit: "cover", position: "top" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hash = rgbaToThumbHash(info.width, info.height, data);
  const thumbhash = Buffer.from(hash).toString("base64");

  return { thumb, thumbhash, width: CARD_W, height: CARD_H };
}
