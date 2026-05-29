// ABOUTME: Next.js instrumentation hook — runs once on server startup. Starts the
// ABOUTME: recurring-capture scheduler in the Node.js runtime only.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
