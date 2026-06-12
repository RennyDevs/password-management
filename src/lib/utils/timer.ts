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

function getTimeoutMs(): number {
  const minutes = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 5;
  return minutes * 60 * 1000;
}

export const SESSION_TIMEOUT_MS = getTimeoutMs();
