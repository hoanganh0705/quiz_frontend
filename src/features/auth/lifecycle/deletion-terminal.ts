/**
 * Deletion-terminal marker for the refresh interceptor.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T23.
 *
 * ## Purpose
 *
 * The refresh interceptor (2.7) needs a single boolean it can
 * check on the 401 hot path: "has this tab committed deletion, or
 * received an `ACCOUNT_DELETED` event from another tab?" If so,
 * it must NOT attempt a refresh — the backend has invalidated
 * every session the cookie might resolve to, and a refresh attempt
 * would be a wasted request that could leak timing information.
 *
 * The marker is intentionally a tiny module-level boolean:
 *   - module-level so all imports share the same value,
 *   - boolean so the 401 handler is a single `if (deletionTerminal)`
 *     hot-path check,
 *   - tiny so it can be imported by the refresh interceptor without
 *     pulling in the rest of the deletion lifecycle.
 *
 * The `login()` path clears the marker via `clearDeletionTerminal()`
 * so a fresh login restores normal refresh behavior.
 *
 * ## Why this is not in `custom-instance.ts` directly
 *
 * `custom-instance.ts` is the cross-tab listener hub; this module
 * is consumed by:
 *
 *   - `custom-instance.ts` (the 401 handler reads `isDeletionTerminal`),
 *   - `deletion-finalization.ts` (the originator's coordinator
 *     calls `markDeletionTerminal()` immediately after committing),
 *   - `deletion-cross-tab.ts` (the receiver's listener calls
 *     `markDeletionTerminal()` before any await).
 *
 * Keeping the marker in a dedicated module avoids a circular
 * dependency between `custom-instance.ts` and the lifecycle
 * modules, and keeps the marker's surface area auditable.
 */

let deletionTerminal = false;

/**
 * Returns true when account deletion has been committed in this
 * tab or has been received from another tab. The refresh
 * interceptor short-circuits when this is true.
 *
 * Source epic: Epic 2.10.
 * Source ticket: 2.10.T23.
 */
export function isDeletionTerminal(): boolean {
  return deletionTerminal;
}

/**
 * Mark the deletion terminal flag. Idempotent.
 *
 * Source epic: Epic 2.10.
 * Source ticket: 2.10.T23.
 *
 * Production callers:
 *   - `deletion-finalization.ts` (T14) — after the originator's
 *     cleanup chain completes,
 *   - `deletion-cross-tab.ts` (T22) — when a sibling tab's
 *     `ACCOUNT_DELETED` event arrives.
 *
 * The function is also re-exported from `custom-instance.ts` so
 * the legacy import path remains stable.
 */
export function markDeletionTerminal(): void {
  deletionTerminal = true;
}

/**
 * Clear the deletion terminal flag. Called after a fresh login so
 * the new session can refresh normally.
 *
 * Source epic: Epic 2.10.
 * Source ticket: 2.10.T23.
 */
export function clearDeletionTerminal(): void {
  deletionTerminal = false;
}

/**
 * Test-only: read the deletion terminal flag.
 *
 * Source epic: Epic 2.10.
 * Source ticket: 2.10.T23.
 */
export function _isDeletionTerminalForTesting(): boolean {
  return deletionTerminal;
}
