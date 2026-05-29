// ABOUTME: Tests for the in-process serial queue — ordering, single concurrency,
// ABOUTME: and resilience when an individual job throws.
import { describe, it, expect, vi } from "vitest";
import { SerialQueue } from "./queue";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("SerialQueue", () => {
  it("runs jobs one at a time, never concurrently", async () => {
    const q = new SerialQueue();
    let active = 0;
    let maxActive = 0;
    const order: number[] = [];

    for (let i = 0; i < 5; i++) {
      q.add(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await tick(5);
        order.push(i);
        active--;
      });
    }

    while (q.size > 0) await tick(5);
    await tick(10);

    expect(maxActive).toBe(1);
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps draining after a job throws (and logs the failure)", async () => {
    const q = new SerialQueue();
    const done: number[] = [];
    // The queue logs failed jobs via console.error; capture it so test output
    // stays clean and we can assert the failure was reported.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    q.add(async () => {
      throw new Error("boom");
    });
    q.add(async () => {
      done.push(2);
    });

    while (q.size > 0) await tick(5);
    await tick(10);

    expect(done).toEqual([2]);
    expect(errorSpy).toHaveBeenCalledWith("[queue] job failed:", expect.any(Error));
    errorSpy.mockRestore();
  });
});
