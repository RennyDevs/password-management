export class SessionTimer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private duration: number;
  private onTimeout: () => void;

  constructor(durationMs: number, onTimeout: () => void) {
    this.duration = durationMs;
    this.onTimeout = onTimeout;
  }

  start(): void {
    this.reset();
  }

  reset(): void {
    this.clear();
    this.timeoutId = setTimeout(() => {
      this.onTimeout();
      this.timeoutId = null;
    }, this.duration);
  }

  clear(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
