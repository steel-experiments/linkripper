// ABOUTME: Filesystem blob storage for archived pages. Each page gets its own
// ABOUTME: directory under the blob dir; this module resolves and reads/writes
// ABOUTME: the individual artifact files (html, markdown, screenshot, thumbnail).
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config";

// The set of artifacts we persist per page. Keys map to fixed filenames so the
// blob path is fully derivable from a page id — nothing extra to store in the DB.
export const ARTIFACTS = {
  html: "page.html",
  markdown: "page.md",
  screenshot: "screenshot.png",
  thumbnail: "thumb.webp",
} as const;

export type Artifact = keyof typeof ARTIFACTS;

const MIME: Record<Artifact, string> = {
  html: "text/html; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  screenshot: "image/png",
  thumbnail: "image/webp",
};

export function pageDir(id: string): string {
  return join(config.blobDir, id);
}

export function artifactPath(id: string, artifact: Artifact): string {
  return join(pageDir(id), ARTIFACTS[artifact]);
}

export function artifactMime(artifact: Artifact): string {
  return MIME[artifact];
}

export async function writeArtifact(
  id: string,
  artifact: Artifact,
  data: Buffer | string,
): Promise<void> {
  mkdirSync(pageDir(id), { recursive: true });
  await writeFile(artifactPath(id, artifact), data);
}

export async function readArtifact(id: string, artifact: Artifact): Promise<Buffer | null> {
  const path = artifactPath(id, artifact);
  if (!existsSync(path)) return null;
  return readFile(path);
}

export function hasArtifact(id: string, artifact: Artifact): boolean {
  return existsSync(artifactPath(id, artifact));
}

// Remove a page's entire blob directory (used when deleting an archived page).
export function removePageBlobs(id: string): void {
  rmSync(pageDir(id), { recursive: true, force: true });
}
