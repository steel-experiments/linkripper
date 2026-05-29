// ABOUTME: Next.js configuration for LINKRIPPER.
// ABOUTME: Marks native/server-only deps as external so they aren't bundled.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles a minimal server for a lean Docker image.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sharp"],
};

export default nextConfig;
