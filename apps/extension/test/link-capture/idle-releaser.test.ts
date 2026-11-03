import { describe, expect, test } from "bun:test";
import { IdleReleaser, type Timers } from "../../src/link-capture/idle-releaser.ts";

/** Timers that only fire when the test says so. */
class ManualTimers implements Timers {
  private next = 0;
  private readonly pending = new Map<number, () => void>();

  setTimeout(callback: () => void): unknown {
    this.next += 1;
    this.pending.set(this.next, callback);
    return this.next;
  }

  clearTimeout(handle: unknown): void {
    this.pending.delete(handle as number);
  }

  get scheduled(): number {
    return this.pending.size;
  }

  fireAll(): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    for (const callback of callbacks) callback();
  }
}

function setup() {
  const events: string[] = [];
  const timers = new ManualTimers();
  const releaser = new IdleReleaser(
    async () => {
      events.push("release");
    },
    15_000,
    timers,
  );
  return { events, timers, releaser };
}

describe("IdleReleaser", () => {
  test("releases once the last use has been idle for the delay, not before", async () => {
    const { events, timers, releaser } = setup();
    expect(await releaser.use(async () => "parsed")).toBe("parsed");
    expect(events).toEqual([]);
    expect(timers.scheduled).toBe(1);
    timers.fireAll();
    await Promise.resolve();
    expect(events).toEqual(["release"]);
  });

  test("a new use before the delay cancels the pending release", async () => {
    const { events, timers, releaser } = setup();
    await releaser.use(async () => undefined);
    await releaser.use(async () => undefined);
    expect(timers.scheduled).toBe(1);
    timers.fireAll();
    await Promise.resolve();
    expect(events).toEqual(["release"]);
  });

  test("nothing is released while a use is still running", async () => {
    const { events, timers, releaser } = setup();
    let finish = () => {};
    const slow = releaser.use(() => new Promise<void>((resolve) => (finish = resolve)));
    await releaser.use(async () => undefined);
    expect(timers.scheduled).toBe(0);
    finish();
    await slow;
    expect(timers.scheduled).toBe(1);
    expect(events).toEqual([]);
  });

  test("a failed use still schedules the release, and the error reaches the caller", async () => {
    const { timers, releaser } = setup();
    await expect(releaser.use(() => Promise.reject(new Error("parse failed")))).rejects.toThrow("parse failed");
    expect(timers.scheduled).toBe(1);
  });

  test("work that starts during a release waits for it to finish", async () => {
    const events: string[] = [];
    const timers = new ManualTimers();
    let finishRelease = () => {};
    const releaser = new IdleReleaser(
      () =>
        new Promise<void>((resolve) => {
          events.push("release started");
          finishRelease = () => {
            events.push("release done");
            resolve();
          };
        }),
      15_000,
      timers,
    );
    await releaser.use(async () => undefined);
    timers.fireAll();
    const next = releaser.use(async () => void events.push("work"));
    await Promise.resolve();
    expect(events).toEqual(["release started"]);
    finishRelease();
    await next;
    expect(events).toEqual(["release started", "release done", "work"]);
  });
});
