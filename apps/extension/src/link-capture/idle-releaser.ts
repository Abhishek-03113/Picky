/** The timer functions IdleReleaser needs; tests pass fakes. */
export interface Timers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/**
 * Runs work against a costly resource and releases it once nothing has used it for `idleMs`: a burst of
 * uses shares one resource, and an idle extension holds none. Work that starts while a release is under
 * way waits for it to finish, so it never runs against a resource that is going away.
 *
 * @example const parser = new IdleReleaser(() => chrome.offscreen.closeDocument(), 15_000)
 * await parser.use(() => parseInOffscreenDocument(html))
 */
export class IdleReleaser {
  private inFlight = 0;
  private idleTimer: unknown = null;
  private releasing: Promise<void> | null = null;

  constructor(
    private readonly release: () => Promise<void>,
    private readonly idleMs: number,
    private readonly timers: Timers = globalThis,
  ) {}

  async use<T>(work: () => Promise<T>): Promise<T> {
    this.inFlight += 1;
    this.cancelPendingRelease();
    try {
      await this.releasing;
      return await work();
    } finally {
      this.inFlight -= 1;
      if (this.inFlight === 0) this.scheduleRelease();
    }
  }

  private cancelPendingRelease(): void {
    if (this.idleTimer === null) return;
    this.timers.clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private scheduleRelease(): void {
    this.idleTimer = this.timers.setTimeout(() => {
      this.idleTimer = null;
      if (this.inFlight > 0) return;
      this.releasing = this.release()
        .catch(() => undefined)
        .finally(() => void (this.releasing = null));
    }, this.idleMs);
  }
}
