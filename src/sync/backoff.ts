export interface BackoffPolicy {
  /** Delay before the first retry, in ms. */
  baseMs: number;
  /** Upper bound on any delay, in ms. */
  capMs: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = { baseMs: 5_000, capMs: 10 * 60_000 };

/**
 * Exponential backoff with "full jitter": a random delay between 0 and min(cap, base * 2^attempt).
 * `attempt` is 1 for the first retry. `random` is injectable so tests are deterministic.
 */
export function nextDelayMs(
  attempt: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const exponent = Math.max(0, attempt - 1);
  const ceiling = Math.min(policy.capMs, policy.baseMs * 2 ** exponent);
  // Keep a small floor so the UI never shows an immediate retry loop.
  const floor = Math.min(policy.baseMs, ceiling);
  return Math.round(floor + random() * (ceiling - floor));
}
