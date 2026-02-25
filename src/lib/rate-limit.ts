/**
 * Simple in-memory rate limiter for auth protection.
 * Not shared across workers but sufficient for single-instance deployment.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a key (username or IP) is rate limited.
 * Returns false if the key has exceeded maxAttempts within windowMs.
 */
export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxAttempts) {
    return false; // blocked
  }

  entry.count += 1;
  return true; // allowed
}

/**
 * Reset rate limit for a key (call on successful auth).
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

/**
 * Check rate limit by IP address (stricter: 5 attempts / minute).
 */
export function checkRateLimitIP(ip: string, maxAttempts = 5, windowMs = 60_000): boolean {
  return checkRateLimit(`ip:${ip}`, maxAttempts, windowMs);
}

/** Constant delay to make brute-force timing-expensive. */
export async function rateLimitDelay(): Promise<void> {
  await new Promise((r) => setTimeout(r, 1500));
}
