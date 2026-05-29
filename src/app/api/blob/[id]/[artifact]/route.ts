// ABOUTME: Serves a page's stored artifacts (thumbnail, screenshot, html, md)
// ABOUTME: from the filesystem blob store, with long-lived immutable caching.
import { NextRequest, NextResponse } from "next/server";
import { ARTIFACTS, readArtifact, artifactMime, type Artifact } from "@/lib/storage";

function isArtifact(value: string): value is Artifact {
  return value in ARTIFACTS;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; artifact: string }> },
) {
  const { id, artifact } = await params;
  if (!isArtifact(artifact)) {
    return NextResponse.json({ error: "unknown artifact" }, { status: 404 });
  }

  const data = await readArtifact(id, artifact);
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": artifactMime(artifact),
      // Artifacts are immutable once captured; safe to cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
