/**
 * `useOptimisticToggle` — the canonical optimistic-with-rollback
 * primitive for Phase 3 follow / unfollow mutations.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source tickets: TKT-3.9.B1 (this primitive) + TKT-3.9.B4 (per-feature
 *                 action hooks that instantiate this primitive with
 *                 `followCategory` / `unfollowCategory` / `followTag`
 *                 / `unfollowTag` from A2) + TKT-3.10 (bookmark
 *                 surface — reuses the same primitive).
 *
 * ## Why this is a separate primitive
 *
 * Story 3.9 introduces the **only** non-trivial mutation primitive
 * in Phase 3. The four per-feature action hooks (B4) are thin
 * instantiations of this primitive; the shared UI surface (B2's
 * `<FollowButton />` + `<FollowErrorNotice />`) branches on this
 * primitive's `lastError.kind` discriminated union to render the
 * right inline copy.
 *
 * The primitive owns:
 *
 *   - **500 ms cooldown** — Story 3.9 line 999. A rapid double-click
 *     within the window is dropped, not queued (matches the
 *     `useRevokeSession` discipline from Story 2.8 T17).
 *   - **Optimistic update** — the consumer flips the boolean state
 *     to the opposite of `currentValue` synchronously. The primitive
 *     is itself a no-op on the cache; the consumer (or a future
 *     `mutate(updater)` wrapper) owns the in-place flip. The primitive
 *     owns the network call + the rollback discipline only.
 *   - **Rollback** — on any non-success outcome, the consumer must
 *     flip the boolean back to `currentValue`. The primitive surfaces
 *     the failure via `lastError`; the rollback policy is the
 *     consumer's responsibility because the cache key (`mutate` vs
 *     `setState`) varies per call site.
 *   - **SWR cache invalidation** — the supplied `keysToInvalidate`
 *     array is invalidated via the global `mutate(key)` import on
 *     both success and on a 404 (the entity was deleted server-side;
 *     the directory must re-fetch).
 *   - **Error classification** — the discriminated union collapses
 *     the `ApiError.status` taxonomy into the four kinds the UI
 *     branches on (`http_429`, `http_404`, `http_4xx`, `http_5xx`,
 *     `unknown`).
 *   - **401 pass-through** — the hook does NOT handle 401 specially.
 *     `orvalCustomInstance` triggers refresh; if refresh fails the
 *     network promise rejects with an `ApiError` (status 401 or 0)
 *     which falls through to `reverted` with `kind: 'unknown'`.
 *
 * ## What this primitive does NOT do
 *
 *   - It does NOT add a 429-backoff wrapper of its own. The global
 *     `errorRetryCount: 3` retry policy in `SwrProvider` retries 429s
 *     before exposing them to the primitive. Once exposed, the
 *     primitive treats them as `reverted` with `kind: 'http_429'`.
 *   - It does NOT inspect `error.response.data.title` for UI copy —
 *     the consumer reads `lastError.kind` and renders the appropriate
 *     copy from B2's `<FollowErrorNotice />`.
 *   - It does NOT log to Sentry / captureException — the rollback is
 *     silent from a telemetry perspective, mirroring the
 *     `useRevokeSession` `already_revoked` discipline.
 *
 * @see useRevokeSession (2.8.T17) — the canonical optimistic-with-rollback
 *      precedent for `currentValue` flip + rollback-on-failure.
 * @see useActiveSessions (2.8.T8) — the companion list-mutation hook.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

/**
 * The opaque SWR key shape. Matches SWR's `Arguments` type
 * (string | ArgumentsTuple | Record | null | undefined | false).
 * ArgumentsTuple = readonly [any, ...unknown[]].
 */
export type OptimisticToggleSWRKey =
  | string
  | readonly [unknown, ...unknown[]]
  | Record<PropertyKey, unknown>
  | null
  | undefined
  | false;

/**
 * The error taxonomy the UI branches on. Single source of truth —
 * `<FollowErrorNotice />` (B2) maps each kind to its inline copy.
 *
 * - `http_429` — per-user throttle on follow POST / unfollow DELETE.
 *   Treated as `reverted` with the 500 ms cooldown NOT lifted (the
 *   user must wait the full window before retrying).
 * - `http_404` — entity deleted server-side. Triggers cache
 *   invalidation on every key in `keysToInvalidate` so the directory
 *   re-fetches and the detail slot renders the deleted state.
 * - `http_4xx` — generic client error (400, 409, 422, …). No cache
 *   invalidation; the entity is intact, only the toggle state is
 *   wrong.
 * - `http_5xx` — server-side failure. No cache invalidation.
 * - `unknown` — non-`ApiError` rejection (network failure, AbortError,
 *   401-after-refresh-failure, …).
 */
export type OptimisticToggleErrorKind =
  | 'http_429'
  | 'http_404'
  | 'http_4xx'
  | 'http_5xx'
  | 'unknown';

export interface OptimisticToggleError {
  /** The discriminated kind the UI branches on. */
  kind: OptimisticToggleErrorKind;
  /**
   * The raw error — `ApiError` for kinds `http_429`, `http_404`,
   * `http_4xx`, `http_5xx`; `unknown` for `unknown` (network failure,
   * 401-after-refresh, AbortError, etc.).
   */
  cause: ApiError | unknown;
}

/**
 * The mutation result the consumer reads.
 *
 * - `status: 'idle'` — no `toggle()` call has been issued yet.
 * - `status: 'pending'` — the most recent `toggle()` call is
 *   in-flight. The consumer should render the disabled / busy state.
 * - `status: 'success'` — the most recent `toggle()` call resolved
 *   successfully. The cache has been invalidated.
 * - `status: 'reverted'` — the most recent `toggle()` call rejected
 *   and the rollback policy has surfaced via `lastError.kind`.
 */
export type OptimisticToggleStatus = 'idle' | 'pending' | 'success' | 'reverted';

export interface UseOptimisticToggleParams<ToggleArgs extends unknown[]> {
  /**
   * The current (pre-toggle) boolean state. The consumer reads this
   * from its own SWR cache and flips it locally before calling
   * `toggle(...)`; the primitive does NOT touch the cache directly
   * — the consumer (or the per-feature slot in B5) owns the
   * `mutate(updater)` call that flips the local state.
   */
  currentValue: boolean;
  /**
   * The async mutation. Returns the wrapped action's success contract
   * (typically `Promise<void>` for follow / unfollow — the backend
   * returns 204 No Content). The promise rejection is routed through
   * the error classifier below.
   */
  toggle: (...args: ToggleArgs) => Promise<unknown>;
  /**
   * Cooldown in milliseconds. Defaults to **500 ms** per Story 3.9
   * line 999. The second call within the window is dropped, not
   * queued.
   */
  cooldownMs?: number;
  /**
   * SWR keys to invalidate on both `success` and `http_404` (the
   * entity was deleted server-side; the directory must re-fetch).
   * Other 4xx / 5xx errors do NOT invalidate (the entity is intact;
   * only the toggle state is wrong).
   */
  keysToInvalidate: readonly OptimisticToggleSWRKey[];
}

export interface UseOptimisticToggleResult<ToggleArgs extends unknown[]> {
  status: OptimisticToggleStatus;
  /**
   * The latest error from a `reverted` transition. `null` whenever
   * `status !== 'reverted'`. Reset to `null` on the next successful
   * `toggle()` call.
   */
  lastError: OptimisticToggleError | null;
  /**
   * Trigger the mutation. Returns `void` synchronously when the call
   * is dropped (within `cooldownMs` of the previous call). Returns
   * `Promise<void>` otherwise — the promise resolves when the
   * mutation completes; it does NOT throw (errors are surfaced via
   * `lastError`).
   */
  toggle: (...args: ToggleArgs) => Promise<void>;
}

/**
 * Classify an error into the discriminated union. Exported for
 * tests; not part of the public hook surface (consumers read
 * `lastError.kind`).
 */
export function classifyOptimisticToggleError(
  cause: unknown,
): OptimisticToggleError {
  if (isApiError(cause)) {
    const status = cause.status;
    if (status === 429) {
      return { kind: 'http_429', cause };
    }
    if (status === 404) {
      return { kind: 'http_404', cause };
    }
    if (status >= 500) {
      return { kind: 'http_5xx', cause };
    }
    return { kind: 'http_4xx', cause };
  }
  return { kind: 'unknown', cause };
}

/**
 * `useOptimisticToggle` — the canonical optimistic-with-rollback
 * primitive. See the file header for the full discipline contract.
 *
 * @example
 * ```ts
 * const { status, lastError, toggle } = useOptimisticToggle({
 *   currentValue: isFollowing,
 *   toggle: () => (isFollowing ? unfollowCategory(id) : followCategory(id)),
 *   keysToInvalidate: [
 *     ['follow-lookup', 'categories', { limit: 500 }],
 *     ['category', id],
 *   ],
 * });
 * ```
 */
export function useOptimisticToggle<ToggleArgs extends unknown[]>(
  params: UseOptimisticToggleParams<ToggleArgs>,
): UseOptimisticToggleResult<ToggleArgs> {
  const { toggle, cooldownMs = 500, keysToInvalidate } = params;

  const [status, setStatus] = useState<OptimisticToggleStatus>('idle');
  const [lastError, setLastError] = useState<OptimisticToggleError | null>(null);

  // Cooldown enforcement via `useRef<number>` of `performance.now()`.
  // The first toggle in a window always fires; subsequent toggles
  // within `cooldownMs` are dropped (B1 AC #3).
  const lastInvocationRef = useRef<number>(0);

  const run = useCallback(
    async (...args: ToggleArgs): Promise<void> => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < cooldownMs) {
        // Drop — within the cooldown window. The cooldown is NOT
        // lifted on rejection (B1 AC #5), so a failed call still
        // counts toward the cooldown budget.
        return;
      }
      lastInvocationRef.current = now;

      setStatus('pending');
      setLastError(null);

      try {
        await toggle(...args);
        // Success — invalidate every key in `keysToInvalidate`
        // (B1 AC #4). The global `mutate` import from `'swr'` is
        // the canonical invalidation primitive.
        await Promise.all(
          keysToInvalidate.map((key) =>
            globalMutate(key, undefined, { revalidate: true }),
          ),
        );
        setStatus('success');
        setLastError(null);
      } catch (cause: unknown) {
        const classification = classifyOptimisticToggleError(cause);

        // 404 — the entity was deleted server-side. Invalidate every
        // key in `keysToInvalidate` so the directory re-fetches
        // (B1 AC #6).
        if (classification.kind === 'http_404') {
          await Promise.all(
            keysToInvalidate.map((key) =>
              globalMutate(key, undefined, { revalidate: true }),
            ),
          );
        }
        // All other 4xx (B1 AC #7) and 5xx (B1 AC #7) and `unknown`
        // (B1 AC #8) errors do NOT invalidate — the entity is intact;
        // only the toggle state is wrong. The consumer owns the
        // rollback (the local flip back to `currentValue`).

        setStatus('reverted');
        setLastError(classification);
        // The cooldown is NOT lifted on rejection (B1 AC #5) —
        // lastInvocationRef.current stays at `now`, so the user must
        // wait the full window before retrying.
      }
    },
    [toggle, cooldownMs, keysToInvalidate],
  );

  // Memoize the returned `toggle` so it does not retrigger SWR
  // re-renders on every parent render (B1 AC #12). `run` depends
  // on `toggle`, `cooldownMs`, and `keysToInvalidate`; the same
  // inputs produce the same reference.
  return {
    status,
    lastError,
    toggle: run,
  };
}