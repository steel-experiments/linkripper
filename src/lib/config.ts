// ABOUTME: Centralizes LINKRIPPER's environment-driven configuration: where data
// ABOUTME: lives and how to reach Steel (cloud key vs. self-hosted base URL).
import { resolve } from "node:path";

const dataDir = resolve(process.env.DATA_DIR ?? "./data");

export const config = {
  dataDir,
  // SQLite file. Defaults inside the data dir so one volume holds everything.
  databasePath: resolve(process.env.DATABASE_PATH ?? `${dataDir}/linkripper.db`),
  // Per-page blobs (html, markdown, screenshot, thumbnail) live here.
  blobDir: resolve(`${dataDir}/archive`),

  steel: {
    apiKey: process.env.STEEL_API_KEY || undefined,
    // When set, the Steel SDK talks to a self-hosted steel-browser instead of cloud.
    baseURL: process.env.STEEL_BASE_URL || undefined,
    // How long to wait (ms) after navigation before capturing, so late-loading
    // content and images settle. Bump this for image-heavy pages.
    captureDelay: Number(process.env.STEEL_CAPTURE_DELAY ?? 3000),
    // Route every capture through a session that auto-scrolls the page first,
    // triggering scroll-lazy (IntersectionObserver) images before the
    // screenshot. Slower/costlier per page, but captures everything.
    scrollCapture: process.env.STEEL_SCROLL_CAPTURE === "true",
  },
};

export function steelConfigured(): boolean {
  return Boolean(config.steel.apiKey || config.steel.baseURL);
}
