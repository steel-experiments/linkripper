// ABOUTME: Vitest configuration — Node environment for the pure logic modules,
// ABOUTME: with the same "@/" path alias the app uses.
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
