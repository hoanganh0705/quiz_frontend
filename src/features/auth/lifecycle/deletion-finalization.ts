/**
 * Account-deletion finalization coordinator.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source tickets: 2.10.T7 (initial success boundary), 2.10.T14
 * (coordinator refactor — composes the T9–T11 cleanup primitives).
 *
 * ## Purpose
 *
 * Single ordered post-success coordinator for account deletion.
 * Defines the boundary between "the backend committed deletion" and
 * "the local browser state reflects the deletion".
 *
 * ## Why a coordinator (not just an inline hook path)
 *
 * The deletion flow has to perform several distinct things in a
 * specific order:
 *
 *   1. **Mark the deletion terminal** before any async cleanup runs,
 *      so a concurrent render cannot win a race and re-render the
 *      protected UI with cached data.
 *   2. **Clear auth markers** (access-token cookie, sensitive
 *      verification flags) via the T9 primitive
 *      (`finalizeDeletedAccountAuthMarkers`).
 *   3. **Clear user-scoped caches** (identity, full profile,
 *      security dashboard, sessions, persisted user store) via the
 *      T10 primitive (`clearAllDeletionCaches`).
 *   4. **Clear persisted account-scoped state** (settings localStorage
 *      keys) via the T11 primitive
 *      (`clearDeletionPersistedAccountState`).
 *   5. **Broadcast the deletion terminal event** once, so every open
 *      tab converges on the same public state.
 *   6. **Replace history** with the public landing route so browser
 *      back/forward cannot restore the protected settings page.
 *
 * Centralising the order here means the hook (2.10.T12) and any
 * cross-tab receiver (2.10.T22–T24) run the same sequence. The
 * coordinator is intentionally synchronous for the marker step and
 * best-effort for the cleanup steps; a partial cleanup failure
 * never re-opens protected UI.
 *
 * ## Primitive composition
 *
 * Each numbered step above delegates to a single-purpose primitive:
 *
 *   - Step 2 → `finalizeDeletedAccountAuthMarkers()` (T9)
 *   - Step 3 → `clearAllDeletionCaches()` (T10)
 *   - Step 4 → `clearDeletionPersistedAccountState()` (T11)
 *
 * The coordinator itself owns:
 *
 *   - the terminal marker,
 *   - the cross-tab broadcast (one event per deletion),
 *   - the history replacement (caller-supplied to keep this module
 *     router-agnostic),
 *   - the error-recording discipline.
 *
 * This split is deliberate: each primitive has a single
 * responsibility and its own focused test (2.10.T9, T10, T11). The
 * coordinator's test (2.10.T14) asserts the ORDER and the
 * idempotence, not the implementation of the steps.
 *
 * ## Why this does NOT call `logout` / `logoutAll`
 *
 * The backend's contract is "successful deletion terminates every
 * active session and clears the refresh-token cookie". Issuing a
 * subsequent logout request would:
 *
 *   - hit the backend's already-invalidated session row, producing a
 *     401 noise that the axios interceptor must NOT retry (the
 *     endpoint is in `AUTH_PATHS`),
 *   - race with the deletion commit,
 *   - violate the epic's exit criterion "no separate logout request
 *     is required after successful deletion".
 *
 * The backend's contract is sufficient: when the response arrives
 * with `200`, every refresh-cookie and access-token-claim the
 * browser holds is already invalid. Local cleanup makes the browser
 * honest about that.
 *
 * ## Refresh suppression
 *
 * The cookie clear inside `finalizeDeletedAccountAuthMarkers()`
 * fires the `auth-state-change` window event and writes the
 * `auth_sync_LOGGED_OUT` payload. The cross-tab listener in
 * `custom-instance.ts` already short-circuits refresh attempts once
 * it sees the token gone. We do NOT issue a separate refresh —
 * that would defeat the auth-cookie invariant.
 *
 * ## Pure vs side-effecting
 *
 * The coordinator is side-effecting on purpose (it touches storage,
 * cookies, broadcast, and history). The contract is:
 *
 *   - Safe to call exactly once per deletion.
 *   - Idempotent: the marker is a module-level boolean, so a second
 *     call returns `{ alreadyFinalized: true }` without re-running
 *     the cleanup steps.
 *   - Best-effort on cleanup: a throw from one step does NOT
 *     short-circuit the remaining steps.
 */

import {
  finalizeDeletedAccountAuthMarkers,
} from '@/features/auth/lifecycle/deletion-auth-markers';
import {
  clearAllDeletionCaches,
} from '@/features/auth/lifecycle/deletion-cache-cleanup';
import {
  clearDeletionPersistedAccountState,
} from '@/features/auth/lifecycle/deletion-persisted-state';
import {
  broadcastAccountDeleted,
} from '@/lib/api/core/broadcast-channel';
import { markDeletionTerminal } from '@/features/auth/lifecycle/deletion-terminal';
import { logger } from '@/shared/log';

/**
 * Module-level terminal marker.
 *
 * Set by `runDeletionFinalization()` on the first invocation;
 * subsequent calls short-circuit. This is the only place this
 * boolean lives; the cross-tab broadcast (2.10.T22) and the
 * protected-route guard (2.10.T21) read it through
 * `isDeletionFinalized()`.
 *
 * Lives in this module (not in `auth.service.ts`) so that the service
 * layer remains a thin SDK-forwarder surface — the lifecycle
 * coordinator is genuinely a different concern.
 */
let deletionFinalized = false;

/**
 * Returns true when `runDeletionFinalization()` has already run on
 * this browser. Used by the cross-tab receiver (2.10.T22) and the
 * protected-route guard (2.10.T21) to short-circuit any attempt to
 * re-render the protected UI while deletion is terminal.
 *
 * Test-only helper `resetDeletionFinalizationForTesting()` clears
 * the marker between vitest cases.
 */
export function isDeletionFinalized(): boolean {
  return deletionFinalized;
}

/**
 * Test-only: reset the terminal marker. Production code never calls
 * this — once deletion is committed locally, the only way out is a
 * fresh login (which clears the marker via `login()`).
 */
export function resetDeletionFinalizationForTesting(): void {
  deletionFinalized = false;
}

/**
 * The result of a finalization attempt.
 *
 * `alreadyFinalized` is true when the marker was already set from a
 * prior call — the caller (the hook) does not need to do anything
 * else in that case.
 *
 * `errors` lists any cleanup-step exceptions that did NOT abort the
 * coordinator. The hook may log these for telemetry; the UI must
 * NOT show them as user-facing errors because the deletion is
 * already terminal.
 */
export interface DeletionFinalizationResult {
  alreadyFinalized: boolean;
  errors: ReadonlyArray<{ step: DeletionCleanupStep; cause: unknown }>;
}

/**
 * The discrete cleanup steps. Listed explicitly so the result's
 * `errors[].step` is type-safe.
 *
 * The list mirrors the coordinator's body — adding a new step
 * requires adding the literal here so the test suite can assert on
 * it without stringly-typed comparisons.
 */
export type DeletionCleanupStep =
  | 'clearAuthMarkers'
  | 'clearAllDeletionCaches'
  | 'clearPersistedAccountState'
  | 'broadcastDeletion'
  | 'replaceHistory';

function recordError(
  errors: Array<{ step: DeletionCleanupStep; cause: unknown }>,
  step: DeletionCleanupStep,
  cause: unknown,
): void {
  logger.warn('auth.deletion', 'cleanup step failed', { step, cause });
  errors.push({ step, cause });
}

/**
 * Run the ordered local-cleanup coordinator for account deletion.
 *
 * Call this exactly once, immediately after the `DELETE /auth/account`
 * response resolves successfully. The hook (`useDeleteAccount`,
 * 2.10.T12) and the cross-tab receiver (2.10.T22) both call into
 * here so the order is identical regardless of which tab committed
 * the deletion.
 *
 * The function does NOT throw on partial cleanup failure — it
 * collects the failures into `result.errors` and continues. The
 * terminal marker is set first, so the protected UI cannot re-render
 * even if every later step throws.
 *
 * History replacement (`history.replaceState` if `window.history` is
 * available) is attempted; the navigator fallback is the public
 * landing route. The hook layer is responsible for the actual
 * route-change after this coordinator returns.
 *
 * ## Side effects (in execution order)
 *
 *   1. Sets the module-level terminal marker (`deletionFinalized`).
 *   2. Calls `finalizeDeletedAccountAuthMarkers()` (T9) — clears
 *      `auth_token` + `refresh_token` cookies, sensitive verification
 *      flags, and the `auth_sync_*` localStorage keys.
 *   3. Calls `clearAllDeletionCaches()` (T10) — drops every
 *      `auth_cache_*` entry, the persisted Zustand user store, the
 *      `auth_sync_*` keys, the deletion-policy persisted keys, and
 *      resets the in-memory `useUserStore.clearUser()`.
 *   4. Calls `clearDeletionPersistedAccountState()` (T11) — drops
 *      `user_store_v1`, `user_settings`, and any future
 *      account-scoped persisted keys.
 *   5. Calls `broadcastAccountDeleted()` so every open tab enters
 *      the deletion-aware cross-tab cleanup path (T22).
 *   6. Calls a caller-supplied `replaceHistory` thunk so this module
 *      does not import a router library.
 *
 * ## Order rationale
 *
 *   - The terminal marker is set FIRST so a concurrent render in
 *     the same tick cannot win the race.
 *   - The cookie clear runs BEFORE the cross-tab broadcast so the
 *     receiver tab's listener sees consistent state when it
 *     processes the event.
 *   - The cache clear runs BEFORE the persisted-state clear because
 *     the cache holds a derived view of the persisted state and
 *     clearing it first guarantees a subsequent `useUser()` read
 *     returns `null`.
 *   - The history replacement runs LAST because it triggers a
 *     navigation; running cleanup after navigation would race with
 *     the new route's mount.
 *
 * @param options - The caller-supplied cleanup hooks.
 * @returns `DeletionFinalizationResult` summarizing the attempt.
 */
export async function runDeletionFinalization(options?: {
  replaceHistory?: () => void;
  /**
   * Skip the cross-tab broadcast. The cross-tab receiver
   * (2.10.T24) sets this to `true` — it is itself a response to
   * a broadcast, so re-broadcasting would loop indefinitely.
   * Defaults to `false` (the originator tab's path).
   */
  skipBroadcast?: boolean;
}): Promise<DeletionFinalizationResult> {
  if (deletionFinalized) {
    return { alreadyFinalized: true, errors: [] };
  }

  const errors: Array<{ step: DeletionCleanupStep; cause: unknown }> = [];

  // Mark terminal FIRST. After this line returns, no matter what
  // happens, `isDeletionFinalized()` returns true. The protected
  // guard (2.10.T21) reads this on every render.
  deletionFinalized = true;

  // Source epic: Epic 2.10.
  // Source ticket: 2.10.T23.
  //
  // The originator tab ALSO marks the deletion-terminal flag so its
  // own refresh interceptor short-circuits. Subsequent 401s in this
  // tab (e.g. a profile fetch that resolves after cleanup) cannot
  // trigger a refresh and re-establish a transient session.
  //
  // `markDeletionTerminal()` is idempotent and safe to call before
  // any await.
  markDeletionTerminal();

  // 1. Clear auth markers (T9 primitive). Drop access-token
  //    cookie, refresh-token cookie, sensitive verification flags,
  //    and the cross-tab sync localStorage keys.
  try {
    finalizeDeletedAccountAuthMarkers();
  } catch (cause) {
    recordError(errors, 'clearAuthMarkers', cause);
  }

  // 2. Clear every user-scoped cache (T10 primitive). Includes
  //    the persisted Zustand user store and the cross-tab sync
  //    keys (belt-and-braces with the T9 primitive).
  try {
    clearAllDeletionCaches();
  } catch (cause) {
    recordError(errors, 'clearAllDeletionCaches', cause);
  }

  // 3. Clear account-scoped persisted state (T11 primitive). The
  //    T10 primitive already removed `user_store_v1`; this step
  //    is the canonical, focused primitive the modal's settings
  //    cleanup can also call directly.
  try {
    clearDeletionPersistedAccountState();
  } catch (cause) {
    recordError(errors, 'clearPersistedAccountState', cause);
  }

  // 4. Broadcast ACCOUNT_DELETED so other tabs converge via the
  //    dedicated deletion path (T22 + T24). The broadcast happens
  //    AFTER local cleanup so receiving tabs do not race with this
  //    tab's cache writes.
  //
  //    The receiver calls this coordinator with `skipBroadcast: true`
  //    so it does not loop. The originator publishes the canonical
  //    event exactly once.
  //
  //    We intentionally use `ACCOUNT_DELETED` rather than `LOGGED_OUT`
  //    because deletion is a terminal state: receiving tabs must
  //    suppress refresh, clear caches and persisted state, and
  //    replace history. The shared LOGGED_OUT path would leave
  //    refresh enabled and route to `/login`, allowing the user
  //    to land on an auth screen that asks for credentials they
  //    no longer have.
  if (!options?.skipBroadcast) {
    try {
      broadcastAccountDeleted();
    } catch (cause) {
      recordError(errors, 'broadcastDeletion', cause);
    }
  }

  // 5. Replace history so back/forward cannot restore the
  //    protected settings page. Caller-supplied so this module
  //    does not import a router library.
  if (options?.replaceHistory) {
    try {
      options.replaceHistory();
    } catch (cause) {
      recordError(errors, 'replaceHistory', cause);
    }
  }

  return { alreadyFinalized: false, errors };
}
