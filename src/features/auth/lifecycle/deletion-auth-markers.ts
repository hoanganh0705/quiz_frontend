/**
 * Auth-marker cleanup primitive for account deletion finalization.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T9.
 *
 * ## Purpose
 *
 * After the backend has authoritatively confirmed account deletion
 * (2xx on `DELETE /auth/account`), the coordinator MUST clear every
 * local browser marker that would otherwise let a stale session
 * pretend to be authenticated:
 *
 *   - the `auth_token` cookie (and the `refresh_token` cookie, which
 *     is dropped together by `clearAuthToken()`),
 *   - any "recently verified" flags the modal set during this
 *     session — a stale `'delete-account'` flag could let a future
 *     tab skip the confirm step.
 *
 * The helper also nukes the cross-tab sync payloads in `localStorage`
 * (`auth_sync_*` keys) so other tabs do not pick up a stale token
 * via the storage-event fallback channel.
 *
 * ## Idempotence
 *
 * `finalizeDeletedAccountAuthMarkers()` is safe to call more than
 * once. The underlying helpers (`clearAuthToken`, `clearVerificationFlags`)
 * already tolerate missing values, and the storage-key removal here
 * uses `removeItem` which is a no-op when the key is absent.
 *
 * ## No network
 *
 * The function performs zero network requests. It is purely local
 * cleanup. The backend already invalidated the session server-side
 * when it returned 2xx on the DELETE.
 *
 * ## No replacement token
 *
 * The function does not set a replacement cookie. After it returns,
 * `getAuthToken()` returns `null`. The coordinator runs BEFORE any
 * redirect so the protected-route guard cannot see a stale token.
 *
 * ## Pre-redirect invariant
 *
 * The deletion coordinator (2.10.T14) is the only consumer; it calls
 * this helper BEFORE `replaceHistory()` so the redirect target cannot
 * read a stale marker.
 *
 * @example
 * ```typescript
 * import { finalizeDeletedAccountAuthMarkers } from
 *   '@/features/auth/lifecycle/deletion-auth-markers';
 *
 * // After backend confirms deletion:
 * finalizeDeletedAccountAuthMarkers();
 * router.replace('/');
 * ```
 */

import { clearAuthToken } from '@/features/auth/utils/auth-cookies';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';

/**
 * Storage keys written by the cross-tab fallback channel in
 * `auth-cookies.ts`. Duplicating the literal here would be a foot-gun
 * (a typo would silently leak auth state); keep this list in sync
 * with the values in `auth-cookies.ts`.
 *
 * Source epic: Epic 2.7 — Cross-tab auth sync (T14 storage-fallback).
 */
const AUTH_SYNC_KEYS: ReadonlyArray<string> = [
  'auth_sync_TOKEN_REFRESHED',
  'auth_sync_LOGGED_IN',
  'auth_sync_LOGGED_OUT',
];

/**
 * Run the auth-marker cleanup. Idempotent and synchronous.
 *
 * Order matters:
 *
 *   1. Wipe verification flags first — a stale `'delete-account'`
 *      flag set earlier in this tab would otherwise survive the
 *      subsequent cookie clear (it is a module-scope `Map`, not
 *      cookie-backed). Wiping it first guarantees the next
 *      `consumeRecentlyVerified('delete-account')` returns `false`.
 *   2. Clear the auth cookies — drops `auth_token` and
 *      `refresh_token`, and writes the `auth_sync_LOGGED_OUT`
 *      payload via `clearAuthToken()`. Other tabs converge on
 *      this signal via the listener in `custom-instance.ts`.
 *   3. Wipe the `auth_sync_*` keys from `localStorage` so a future
 *      tab that boots without `BroadcastChannel` (the
 *      storage-event fallback) cannot replay a stale token.
 *
 * The third step runs AFTER the cookie clear so the order on the
 * wire is "auth-token gone → cross-tab event fired → localStorage
 * cleaned". This matches the discipline in `revokeCurrentSession`.
 */
export function finalizeDeletedAccountAuthMarkers(): void {
  clearVerificationFlags();
  clearAuthToken();

  if (typeof localStorage === 'undefined') return;

  try {
    for (const key of AUTH_SYNC_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — fail silently. The cookie clear is the
    // authoritative cleanup; the storage-key wipe is best-effort.
  }
}

/**
 * For tests: snapshot of the localStorage keys the helper will
 * wipe. Production code never reads this directly; the constant is
 * re-declared inside the function for safety.
 */
export function _internalAuthSyncKeysForTest(): ReadonlyArray<string> {
  return AUTH_SYNC_KEYS;
}
