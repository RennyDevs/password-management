/**
 * Client-side rate limiter with exponential backoff.
 *
 * Limits consecutive failed attempts and enforces a lockout timer
 * after exceeding the threshold. Delay doubles with each attempt
 * beyond MAX_ATTEMPTS.
 */

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

export interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
}

/**
 * Compute lock delay for a given attempt count (exponential backoff).
 */
export function getLockDelay(attemptCount: number): number {
  return BASE_DELAY_MS * Math.pow(2, attemptCount - MAX_ATTEMPTS);
}

/**
 * Process a failed attempt and return the next state.
 *
 * Returns the updated state and an optional lock message key + params.
 */
export function processFailedAttempt(prev: RateLimitState): {
  state: RateLimitState;
  remaining: number;
  lockedSeconds: number;
} {
  const attempts = prev.attempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    const delay = getLockDelay(attempts);
    return {
      state: { attempts, lockedUntil: Date.now() + delay },
      remaining: 0,
      lockedSeconds: Math.ceil(delay / 1000),
    };
  }

  return {
    state: { attempts, lockedUntil: null },
    remaining: MAX_ATTEMPTS - attempts,
    lockedSeconds: 0,
  };
}

/**
 * Check if lockout is still active. Returns remaining seconds or 0.
 */
export function getLockRemaining(lockedUntil: number | null): number {
  if (lockedUntil && Date.now() < lockedUntil) {
    return Math.ceil((lockedUntil - Date.now()) / 1000);
  }
  return 0;
}
