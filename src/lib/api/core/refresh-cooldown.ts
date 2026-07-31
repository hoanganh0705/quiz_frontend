/**
 * Refresh cooldown manager — prevents refresh spin loops.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T3.
 *
 * ## Purpose
 *
 * After a failed refresh attempt, the client MUST suppress further refresh
 * attempts for a minimum duration (one second). Without this:
 *
 *   1. A refresh fails (network timeout, server error)
 *   2. The interceptor retries immediately
 *   3. The second refresh fails for the same reason
 *   4. The interceptor retries immediately again
 *   5. → Infinite retry loop (spin)
 *
 * The cooldown enforces a one-second gap between the last failed refresh
 * and the next refresh attempt. This gives transient failures time to
 * recover and prevents the client from overwhelming the server.
 *
 * ## Design
 *
 * - Uses module-level state (simple timestamps)
 * - No `window`/`document` dependencies — pure timestamp arithmetic
 * - Idempotent: calling `startCooldown()` multiple times doesn't stack cooldowns
 * - Thread-safe for the single-threaded JS event loop
 *
 * ## Usage
 *
 * ```typescript
 * import { isInCooldown, startCooldown, clearCooldown } from './refresh-cooldown';
 *
 * // Before attempting a refresh
 * if (isInCooldown()) {
 *   return; // Block the refresh
 * }
 *
 * try {
 *   await doRefresh();
 *   clearCooldown();
 * } catch {
 *   startCooldown(); // Start the 1-second cooldown
 *   throw;
 * }
 * ```
 *
 * ## Cooldown timing
 *
 * The cooldown duration is **exactly 1000ms** (one second). This value
 * was chosen because:
 *
 * - It's long enough to catch most transient failures (network hiccup, brief server overload)
 * - It's short enough to not significantly impact user experience
 * - It matches the requirement in Epic 2.7: "Refresh failure enforces the one-second cooldown"
 */

const COOLDOWN_DURATION_MS = 1000;

/**
 * Timestamp (from `Date.now()`) when the cooldown started.
 * `null` means no cooldown is active.
 */
let cooldownStartedAt: number | null = null;

/**
 * Check if the refresh cooldown is currently active.
 *
 * @returns true if a cooldown is active and refresh attempts should be blocked
 *
 * @example
 * ```typescript
 * if (isInCooldown()) {
 *   // Don't attempt refresh; wait for cooldown to expire
 *   return;
 * }
 * ```
 */
export function isInCooldown(): boolean {
  if (cooldownStartedAt === null) {
    return false;
  }

  const now = Date.now();
  const elapsed = now - cooldownStartedAt;

  return elapsed < COOLDOWN_DURATION_MS;
}

/**
 * Start the refresh cooldown.
 *
 * Subsequent calls to `isInCooldown()` will return `true` for exactly
 * one second from when this function was first called.
 *
 * Idempotent: calling this multiple times does not extend the cooldown
 * duration (the start timestamp is not updated if a cooldown is active).
 *
 * @example
 * ```typescript
 * try {
 *   await doRefresh();
 * } catch {
 *   startCooldown(); // Start 1-second cooldown
 *   throw;
 * }
 * ```
 */
export function startCooldown(): void {
  // Idempotent: don't reset the start time if cooldown is already active
  if (cooldownStartedAt === null) {
    cooldownStartedAt = Date.now();
  }
}

/**
 * Clear the refresh cooldown.
 *
 * Call this after a successful refresh so the next 401 can trigger
 * a fresh refresh without waiting for the cooldown to expire.
 *
 * Idempotent: calling this when no cooldown is active is a no-op.
 *
 * @example
 * ```typescript
 * try {
 *   const token = await doRefresh();
 *   clearCooldown();
 *   return token;
 * } catch {
 *   startCooldown();
 *   throw;
 * }
 * ```
 */
export function clearCooldown(): void {
  cooldownStartedAt = null;
}

/**
 * Get the remaining cooldown time in milliseconds.
 *
 * Returns `0` if no cooldown is active or if the cooldown has expired.
 * This is primarily useful for testing and debugging.
 *
 * @returns remaining cooldown duration in ms
 *
 * @example
 * ```typescript
 * const remaining = getRemainingCooldownMs();
 * console.log(`Cooldown expires in ${remaining}ms`);
 * ```
 */
export function getRemainingCooldownMs(): number {
  if (cooldownStartedAt === null) {
    return 0;
  }

  const now = Date.now();
  const elapsed = now - cooldownStartedAt;
  const remaining = COOLDOWN_DURATION_MS - elapsed;

  return remaining > 0 ? remaining : 0;
}

/**
 * Reset cooldown state (primarily for testing).
 *
 * @internal — not exported in the public module surface
 */
export function _resetCooldownForTesting(): void {
  cooldownStartedAt = null;
}
