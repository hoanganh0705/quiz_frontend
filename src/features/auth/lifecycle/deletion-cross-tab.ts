/**
 * Cross-tab receiver for `ACCOUNT_DELETED` events.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source tickets: 2.10.T22, 2.10.T23, 2.10.T24.
 *
 * ## Purpose
 *
 * When a sibling tab commits the deletion, every other open tab must
 * converge on the same public, refresh-suppressed, history-replaced
 * terminal state. The receiving tab has NOT itself issued a DELETE
 * request, so it cannot rely on the hook's local finalization path.
 *
 * This module is the single owner of the cross-tab receiver logic.
 * It is imported and wired by `custom-instance.ts` so that the
 * `ACCOUNT_DELETED` event flows through the same listener registry
 * as `LOGGED_OUT` / `LOGGED_IN` / `TOKEN_REFRESHED`.
 *
 * ## What the receiver does
 *
 *   1. **Mark refresh terminal** (T23) — `markDeletionTerminal()` is
 *      called before any await, so any subsequent 401 in this tab
 *      short-circuits without a refresh request.
 *   2. **Cancel any in-flight refresh** (T23) — same as
 *      `LOGGED_OUT` does, but the deletion marker is also set so
 *      the late response cannot rescue the token.
 *   3. **Run the same cleanup chain** (T24) — the receiving tab
 *      invokes `runDeletionFinalization()` so caches, persisted
 *      state, and sensitive form values are cleared identically to
 *      the originator tab.
 *   4. **Skip history replacement** — the originator tab is the one
 *      that runs `history.replaceState`; the receiving tab uses
 *      `router.replace(DELETION_PUBLIC_LANDING_PATH)` (in the
 *      guarded page) so the navigation is per-tab.
 *   5. **Skip the unused LOGGED_OUT redirect** — the deletion
 *      path replaces history to the public landing, not `/login`.
 *
 * ## Why this is not just a `LOGGED_OUT` event
 *
 * `LOGGED_OUT` is the right semantic for ordinary logout. For
 * deletion, we want both the LOGGED_OUT machinery (cancel in-flight
 * refresh, clear verification flags) AND the deletion-only
 * machinery (suppress refresh permanently, clear caches, replace
 * history). A separate event lets the listener dispatch on
 * `event.type` and apply the right policy.
 *
 * ## Idempotence
 *
 * Receiving the same `ACCOUNT_DELETED` event twice (e.g. a fast
 * re-broadcast on a flaky storage fallback) is safe: the
 * coordinator's `deletionFinalized` boolean short-circuits on the
 * second call.
 */

import {
  cancelInFlightRefresh,
} from '@/lib/api/core/custom-instance';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
  clearAuthToken,
} from '@/features/auth/utils/auth-cookies';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { runDeletionFinalization } from '@/features/auth/lifecycle/deletion-finalization';
import {
  buildDeletionReplaceHistory,
} from '@/features/auth/lifecycle/deletion-history';
import { markDeletionTerminal } from '@/features/auth/lifecycle/deletion-terminal';
import { isInCooldown, clearCooldown } from '@/lib/api/core/refresh-cooldown';
import type { AuthEvent } from '@/lib/api/core/broadcast-channel';

/**
 * Handle an `ACCOUNT_DELETED` event from another tab.
 *
 * Source epic: Epic 2.10.
 * Source ticket: 2.10.T22 + 2.10.T23 + 2.10.T24.
 *
 * Order is the same as the originator's `runDeletionFinalization()`
 * coordinator, but with the deletion marker lifted FIRST so that
 * any 401 raised by the same-tick React render rejects before
 * dispatching a refresh.
 *
 * History replacement runs LASTER than the local cleanup so the
 * navigation does not interrupt the synchronous cleanup chain.
 *
 * The `event` parameter is currently unused — the receiver does
 * not need to inspect the payload, because the deletion-terminal
 * state is a module-level boolean. The parameter is kept so the
 * signature matches the rest of the `subscribeToAuthEvents`
 * listener family and so future payloads (e.g. an invalidated
 * session id) can be inspected without a breaking change.
 */
export function handleRemoteAccountDeleted(event: AuthEvent): void {
  void event;
  // 1. Mark deletion terminal BEFORE any await so any 401 raised
  //    by the same-tick React render bypasses the refresh path.
  markDeletionTerminal();

  // 2. Cancel any in-flight refresh so pending waiters reject with
  //    the deletion-terminal error rather than resolving a token.
  cancelInFlightRefresh();

  // 3. Clear the refresh cooldown so the next tab's login is not
  //    accidentally short-circuited by a stale 401-classifier.
  if (isInCooldown()) {
    clearCooldown();
  }

  // 4. Clear verification flags (mirrors LOGGED_OUT behavior).
  clearVerificationFlags();

  // 5. Clear the access token cookie so even a misclassified 401
  //    that bypasses the deletion-terminal guard does not write
  //    a token back.
  clearAuthToken();

  // 6. Clear all user-scoped caches so the receiving tab cannot
  //    re-render deleted-account data on its next render.
  clearAllAuthCache();

  // 7. Run the same cleanup chain the originator tab ran, so the
  //    persisted account state (Zustand user store, settings
  //    localStorage entries, sensitive form values) is cleared
  //    identically. The coordinator is idempotent on
  //    `deletionFinalized` so this is safe.
  //
  //    `skipBroadcast: true` because the receiver is itself a
  //    response to a broadcast — re-broadcasting would loop
  //    between sibling tabs.
  void runDeletionFinalization({
    // The receiving tab does its own history replacement via the
    // `DeletionGuard` route guard; we deliberately skip the
    // coordinator's history step here so the two tabs do not
    // both fight to replace history.
    replaceHistory: undefined,
    skipBroadcast: true,
  });

  // 8. Replace history so back/forward cannot restore the
  //    protected settings page. The receiving tab's
  //    `DeletionGuard` (2.10.T21) is the one that performs the
  //    `router.replace(DELETION_PUBLIC_LANDING_PATH)`
  //    navigation; this step is the history-replacement
  //    complement that prevents the protected route from
  //    showing in the back/forward stack.
  try {
    const replace = buildDeletionReplaceHistory();
    replace();
  } catch {
    // Best-effort: the guard's `router.replace` is the
    // authoritative navigation that follows this step.
  }
}
