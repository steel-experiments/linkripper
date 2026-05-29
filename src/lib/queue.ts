// ABOUTME: A tiny in-process, single-concurrency job queue. Captures run one at a
// ABOUTME: time in the background so adding a URL returns instantly; no Redis.
type Job = () => Promise<void>;

export class SerialQueue {
  private queue: Job[] = [];
  private running = false;

  // Enqueue a job and ensure the drain loop is running. Returns immediately.
  add(job: Job): void {
    this.queue.push(job);
    void this.drain();
  }

  get size(): number {
    return this.queue.length + (this.running ? 1 : 0);
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        try {
          await job();
        } catch (err) {
          // A failing job must never kill the drain loop; the job itself is
          // responsible for recording its own failure (e.g. marking the page).
          console.error("[queue] job failed:", err);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

// Survive Next.js hot reloads so we don't spin up multiple competing queues.
const globalForQueue = globalThis as unknown as { __linkripperQueue?: SerialQueue };
export const captureQueue = globalForQueue.__linkripperQueue ?? new SerialQueue();
if (process.env.NODE_ENV !== "production") globalForQueue.__linkripperQueue = captureQueue;
