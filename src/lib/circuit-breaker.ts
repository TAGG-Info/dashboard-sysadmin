import { loggers } from '@/lib/logger';

interface CircuitState {
  failures: number;
  openUntil: number; // timestamp ms
}

const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const OPEN_DURATION = 30_000; // 30s

/**
 * Check if the circuit for a given key is open (tripped).
 * If the open period has expired, the circuit transitions to half-open
 * (deleted from the map) to allow one probe request through.
 */
export function isCircuitOpen(key: string): boolean {
  const state = circuits.get(key);
  if (!state) return false;
  if (state.failures < FAILURE_THRESHOLD) return false;
  if (Date.now() > state.openUntil) {
    // Half-open: allow one request through
    circuits.delete(key);
    return false;
  }
  return true;
}

/**
 * Record a failure for the given key. After FAILURE_THRESHOLD consecutive
 * failures, the circuit opens for OPEN_DURATION.
 */
export function recordFailure(key: string): void {
  const state = circuits.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + OPEN_DURATION;
    loggers.cache.warn({ key, failures: state.failures }, 'Circuit breaker opened');
  }
  circuits.set(key, state);
}

/**
 * Record a success — resets the failure counter for the given key.
 */
export function recordSuccess(key: string): void {
  circuits.delete(key);
}
