"use client";

/**
 * Verification-flag store — short-lived, action-scoped, in-memory
 * "recently verified" flags for sensitive actions.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T8.
 *
 * ## Purpose
 *
 * Tracks "this action has been re-authenticated within the last N
 * seconds" so the security UX does not force the user to retype
 * their current password every time the modal is dismissed and
 * reopened (e.g. accidental Escape, focus loss, re-render).
 *
 * Strictly a UX optimization. The flag is NOT a substitute for the
 * backend's `VerifyPasswordDto` payload — every re-verification
 * flow re-collects the password on the wire before performing a
 * sensitive action.
 *
 * ## In-memory only
 *
 * The flag store is module-scope `Map`. **No** `localStorage`,
 * **no** `sessionStorage`, **no** cookies, **no** URL parameters,
 * **no** React Query / SWR cache keys. Verified by the unit suite
 * (2.9.T8 testing checklist) via localStorage spy.
 *
 * ## Action scoping
 *
 * Each `actionId` is independent. Setting `'change-password'` does
 * NOT clear `'delete-account'`. The consumer is responsible for
 * choosing action IDs that do not collide.
 *
 * ## Single-use consumption
 *
 * `consumeRecentlyVerified(actionId)` returns `true` once and
 * clears the flag. The caller is expected to react to the
 * verification (e.g. open the change-password card) and then
 * forget the flag. A second `consume` returns `false`.
 *
 * ## TTL
 *
 * The default TTL is 15 seconds. After that, the flag is treated
 * as expired and `consume` returns `false`. The TTL is intentionally
 * short — the flag is only useful while the user is *immediately*
 * about to perform the action. A long-lived flag would be a
 * security regression.
 *
 * ## Auth-change clear
 *
 * `clearVerificationFlags()` is called from:
 *   - the cross-tab `LOGGED_OUT` listener in `custom-instance.ts`
 *     (2.9.T10),
 *   - the local logout handler in `use-auth-state.ts` (2.9.T10),
 *   - the account-switch handler in `use-auth-state.ts` (2.9.T10).
 *
 * A stale "recently verified" flag must NEVER survive an auth change.
 *
 * @example
 * ```typescript
 * import {
 *   markRecentlyVerified,
 *   consumeRecentlyVerified,
 *   clearVerificationFlags,
 * } from '@/features/auth/utils/verification-flag';
 *
 * // After a successful verify in the modal:
 * markRecentlyVerified('change-password');
 *
 * // When the user clicks the change-password CTA:
 * if (consumeRecentlyVerified('change-password')) {
 *   openChangePasswordCard();
 * } else {
 *   openVerifyPasswordModal();
 * }
 *
 * // On logout:
 * clearVerificationFlags();
 * ```
 */

const DEFAULT_TTL_MS = 15_000;

import { useSyncExternalStore } from "react";

/**
 * A single flag entry — the timestamp it was set, plus the TTL that
 * was in effect at the time of `markRecentlyVerified`. Stored
 * values are millisecond timestamps; the consumer never reads them
 * directly.
 */
interface FlagEntry {
  markedAt: number;
  ttlMs: number;
}

/**
 * The flag store. Module-scope `Map` so every consumer in the same
 * tab sees the same flag. Per-tab scope is fine because the flag is
 * a UX optimization tied to *this* tab's modal — other tabs would
 * open their own modal and re-verify.
 */
const flags = new Map<string, FlagEntry>();

/**
 * Listener registry for `useSyncExternalStore` consumers.
 *
 * P0-7 cleanup: the previous implementation exposed a plain
 * module-scope `Map` with no subscriber hook. React components that
 * wanted to re-render when a flag changed had to poll (which
 * defeats the purpose of the TTL) or wire their own
 * `useEffect`-based pub-sub. We now expose a `subscribe`/`getSnapshot`
 * pair so `useSyncExternalStore` can subscribe without polling.
 */
type FlagListener = () => void;
const listeners = new Set<FlagListener>();

/**
 * Notify every registered listener that the flag store changed.
 * Called from `markRecentlyVerified`, `consumeRecentlyVerified`,
 * `isRecentlyVerified` (on expiry purge), and `clearVerificationFlags`.
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Mark an action as recently verified. The flag expires after
 * `ttlMs` (default 15_000 ms).
 *
 * If a previous flag for the same `actionId` exists, it is
 * overwritten — the new timestamp wins.
 *
 * @param actionId - The action identifier (e.g. `'change-password'`)
 * @param ttlMs - Time-to-live in milliseconds. Defaults to 15s.
 */
export function markRecentlyVerified(
  actionId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  flags.set(actionId, {
    markedAt: Date.now(),
    ttlMs,
  });
  // P0-7: notify `useSyncExternalStore` consumers so components
  // re-render without polling.
  notifyListeners();
}

/**
 * Consume the recently-verified flag for `actionId`.
 *
 * Returns `true` once and clears the flag. Subsequent calls
 * (whether immediate or after the TTL elapsed) return `false`.
 *
 * Returns `false` if the flag is unknown, expired, or has already
 * been consumed in this tab.
 *
 * @param actionId - The action identifier
 * @returns `true` if the flag was set and not expired AND not yet
 *          consumed; `false` otherwise.
 */
export function consumeRecentlyVerified(actionId: string): boolean {
  const entry = flags.get(actionId);
  if (!entry) {
    return false;
  }

  const age = Date.now() - entry.markedAt;
  if (age >= entry.ttlMs) {
    // Expired — purge so the next call does not pay the lookup cost.
    flags.delete(actionId);
    notifyListeners();
    return false;
  }

  // Single-use: consume wipes the flag.
  flags.delete(actionId);
  notifyListeners();
  return true;
}

/**
 * Peek at the flag without consuming it. Returns `true` if the flag
 * is set and not yet expired. Useful for UI guards that want to
 * show a "verified" indicator without invalidating the flag.
 *
 * @param actionId - The action identifier
 * @returns `true` if the flag is set, not expired, and not yet
 *          consumed; `false` otherwise.
 */
export function isRecentlyVerified(actionId: string): boolean {
  const entry = flags.get(actionId);
  if (!entry) {
    return false;
  }

  const age = Date.now() - entry.markedAt;
  if (age >= entry.ttlMs) {
    flags.delete(actionId);
    notifyListeners();
    return false;
  }

  return true;
}

/**
 * Clear every flag. Called on logout (local and cross-tab) and on
 * account switch. Cleared flags must be re-set by a fresh verify
 * call before any consumer can re-claim the action.
 */
export function clearVerificationFlags(): void {
  flags.clear();
  notifyListeners();
}

/**
 * For tests: the current flag store as a plain object. Production
 * code should never read this directly — the helper functions above
 * are the only public API.
 */
export function _debugFlags(): Record<string, FlagEntry> {
  return Object.fromEntries(flags.entries());
}

/**
 * For tests: reset the module-level state. Not exported in the
 * production barrel.
 */
export function _resetVerificationFlags(): void {
  flags.clear();
  notifyListeners();
}

/**
 * `useVerificationFlag` — React subscription primitive for the
 * verification-flag store.
 *
 * P0-7 cleanup: this hook is the recommended way to read flag state
 * from React components. It uses `useSyncExternalStore` so the
 * component re-renders whenever the store changes (via
 * `markRecentlyVerified`, `consumeRecentlyVerified`, or
 * `clearVerificationFlags`) without `useEffect`-based polling.
 *
 * The return value is `true` if the flag is set and not yet expired
 * (it does NOT consume the flag). Use the imperative
 * `consumeRecentlyVerified` to consume after the user takes the
 * action.
 *
 * ## SSR
 *
 * `useSyncExternalStore` returns the snapshot from
 * `getServerSnapshot` during SSR. We return `false` (no flag set)
 * on the server because the flag store is per-tab in-memory state
 * that does not exist during SSR.
 *
 * ## TTL
 *
 * The TTL is enforced at read-time (in `isRecentlyVerified` and
 * `consumeRecentlyVerified`). The `useSyncExternalStore` snapshot
 * reflects the current `isRecentlyVerified` value, which purges
 * expired flags on read and notifies listeners — so a component
 * that re-renders on TTL expiry will see the flag drop to `false`
 * automatically.
 */
export function useVerificationFlag(actionId: string): boolean {
  const subscribe = (listener: FlagListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = (): boolean => isRecentlyVerified(actionId);
  const getServerSnapshot = (): boolean => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
