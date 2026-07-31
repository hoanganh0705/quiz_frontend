/**
 * Account-deletion cache cleanup primitive.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T10.
 *
 * ## Purpose
 *
 * After the backend confirms account deletion (2xx on
 * `DELETE /auth/account`), the coordinator must clear every
 * client-side cache that could repopulate deleted-account data
 * before the protected-route guard evaluates the next render:
 *
 *   - identity (`auth_cache_{userId}_identity`) and profile
 *     (`auth_cache_{userId}_profile`) entries managed by
 *     `user-scoped-cache.ts` (Epic 2.5);
 *   - the persisted Zustand `user_store_v1` entry — it stores the
 *     full profile payload that the `useUser` selector reads
 *     synchronously on first render (Epic 2.5 / `users/store`);
 *   - any persisted auth-gate / security-dashboard / session
 *     entries that might leak into the next render before the
 *     protected-route guard rerenders.
 *
 * The helper EXTENDS `clearAllAuthCache()` rather than duplicating
 * it: the existing function already removes every `auth_cache_*`
 * localStorage entry, which covers the identity/profile entries.
 * The deletion-specific additions are the persisted Zustand store
 * and the additional non-`auth_cache_*` keys the deletion policy
 * requires cleared.
 *
 * ## Best-effort discipline
 *
 * Each cleanup step is wrapped in its own `try` so a failure in one
 * step (e.g. storage quota) does not block the remaining steps.
 * The function is best-effort by design: the backend has already
 * invalidated the server-side session, so the worst case is a
 * leftover stale cache entry that disappears on TTL expiry or the
 * next reload. The hook must NEVER re-open protected UI on a
 * cleanup rejection.
 *
 * ## Idempotence
 *
 * Re-running the helper is safe — every step uses `removeItem`
 * which is a no-op when the key is absent, and the Zustand
 * `clearUser()` action is a pure state reset.
 *
 * ## Per-cache reporting
 *
 * The function returns a `DeletionCacheCleanupReport` so the test
 * suite can assert that *every* expected step ran. Production code
 * can ignore the return value.
 */

import { clearAllAuthCache } from "@/features/auth/utils/user-scoped-cache";
import { clearPersistedUserStore } from "./deletion-persisted-state";
import { useUserStore } from "@/features/users/store/user-store";
import { AUTH_PERSISTENT_KEYS } from "./deletion-persisted-state";

/**
 * Cross-tab storage-fallback keys written by `auth-cookies.ts`.
 * Duplicated here intentionally: those literals live behind a
 * module-private `STORAGE_SYNC_*` constant in `auth-cookies.ts` and
 * we do not want to widen that module's surface just for cleanup.
 * Keep this list in sync with `auth-cookies.ts` (Epic 2.7 / T14
 * storage-fallback).
 */
const CROSS_TAB_SYNC_KEYS: ReadonlyArray<string> = Object.freeze([
  "auth_sync_TOKEN_REFRESHED",
  "auth_sync_LOGGED_IN",
  "auth_sync_LOGGED_OUT",
]);

/**
 * Per-step cleanup report. Each entry names the cleanup stage and
 * whether it succeeded. Used by the unit suite (2.10.T10 testing
 * checklist) to assert that no cleanup step silently dropped.
 */
export interface DeletionCacheCleanupReport {
  /**
   * Every `auth_cache_*` key removed. Mirrors what
   * `clearAllAuthCache()` does today.
   */
  authCache: { ran: boolean; removedKeys: ReadonlyArray<string> };
  /**
   * The persisted Zustand user store (`user_store_v1`).
   */
  persistedUserStore: { ran: boolean };
  /**
   * The cross-tab `auth_sync_*` storage keys (Epic 2.7 fallback).
   * These are also removed by `finalizeDeletedAccountAuthMarkers`
   * (2.10.T9) but are wiped here too so a missing call to that
   * helper does not leak them.
   */
  crossTabSyncKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };
  /**
   * Other deletion-scoped persisted keys (auth-marker side keys,
   * settings-side keys the deletion policy clears, etc.).
   */
  additionalPersistedKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };
  /**
   * The Zustand in-memory `useUserStore` cleared via `clearUser()`.
   * Resets the in-memory user object to `null` so a subsequent
   * `useUser()` read on the public landing route returns `null`.
   */
  inMemoryUserStore: { ran: boolean };
}

/**
 * Run every deletion-scoped cache cleanup step. Idempotent and
 * best-effort.
 *
 * Order:
 *
 *   1. `clearAllAuthCache()`         — drops every `auth_cache_*` key.
 *   2. `clearPersistedUserStore()`   — drops the persisted Zustand
 *                                       `user_store_v1` entry (the
 *                                       `useUser()` source-of-truth).
 *   3. Wipe cross-tab storage keys   — drops `auth_sync_*` keys so the
 *                                       storage-event fallback cannot
 *                                       replay a stale token.
 *   4. Wipe additional persisted keys — drops the auth-marker side
 *                                       keys the deletion policy
 *                                       requires cleared (this is the
 *                                       hook between T10 and T11).
 *   5. `useUserStore.clearUser()`    — resets the in-memory user
 *                                       object to `null`. Uses the
 *                                       imported action so the unit
 *                                       suite can spy on it.
 *
 * @returns A per-step report. Tests assert every `ran` is `true`.
 */
export function clearAllDeletionCaches(): DeletionCacheCleanupReport {
  // 1. Wipe every auth_cache_* entry.
  let removedAuthCacheKeys: ReadonlyArray<string> = [];
  let authCacheRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      const before: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("auth_cache_")) before.push(key);
      }
      clearAllAuthCache();
      removedAuthCacheKeys = before;
      authCacheRan = true;
    } else {
      authCacheRan = false;
    }
  } catch {
    authCacheRan = false;
  }

  // 2. Drop the persisted Zustand user store.
  let persistedUserStoreRan = false;
  try {
    persistedUserStoreRan = clearPersistedUserStore();
  } catch {
    persistedUserStoreRan = false;
  }

  // 3. Wipe cross-tab storage keys.
  const removedCrossTabKeys: string[] = [];
  let crossTabRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      for (const key of CROSS_TAB_SYNC_KEYS) {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedCrossTabKeys.push(key);
        }
      }
    }
    crossTabRan = true;
  } catch {
    crossTabRan = false;
  }

  // 4. Wipe additional deletion-policy keys (T11 contribution).
  const removedAdditionalKeys: string[] = [];
  let additionalRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      for (const key of AUTH_PERSISTENT_KEYS) {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedAdditionalKeys.push(key);
        }
      }
    }
    additionalRan = true;
  } catch {
    additionalRan = false;
  }

  // 5. Reset in-memory Zustand store via the registered action.
  let inMemoryUserStoreRan = false;
  try {
    useUserStore.getState().clearUser();
    inMemoryUserStoreRan = true;
  } catch {
    inMemoryUserStoreRan = false;
  }

  return {
    authCache: { ran: authCacheRan, removedKeys: removedAuthCacheKeys },
    persistedUserStore: { ran: persistedUserStoreRan },
    crossTabSyncKeys: { ran: crossTabRan, removedKeys: removedCrossTabKeys },
    additionalPersistedKeys: {
      ran: additionalRan,
      removedKeys: removedAdditionalKeys,
    },
    inMemoryUserStore: { ran: inMemoryUserStoreRan },
  };
}

/**
 * Export the cross-tab key list for tests. Production code never
 * reads this directly.
 */
export const _internalCrossTabKeysForTest = CROSS_TAB_SYNC_KEYS;
