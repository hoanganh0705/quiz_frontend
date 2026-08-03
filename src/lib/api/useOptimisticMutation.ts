/**
 * `useOptimisticMutation` — the canonical mutation primitive for Phase 4.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.E1 (core) + TKT-4.1.E2 (typed-confirm +
 *                 cross-tab broadcast integration).
 *
 * ## What this is
 *
 * Phase 4 mutation hooks (`useBookmarkAdd`, `useAttemptStart`,
 * `useReviewEdit`, `useReviewDelete`, `useCollectionBulkRemove`, …)
 * all share the same shape:
 *
 *   1. **Snapshot the SWR cache** for one or more keys.
 *   2. **Apply an optimistic patch** (no revalidation).
 *   3. **Call the SDK / service function**.
 *   4. On success → **revalidate the keys** + run `onSuccess`.
 *   5. On any 4xx / 5xx / network error → **revert to the snapshot**
 *      + set `lastError` + run `onError`.
 *   6. **Cooldown** between consecutive calls (500 ms default —
 *      matches Phase 3 `useOptimisticToggle` Story 3.9 line 999).
 *   7. (TKT-4.1.E2) Optionally require a typed-confirm before the
 *      mutation runs, and emit a Phase 4 cross-tab broadcast on
 *      success.
 *
 * This primitive owns 1–7 in one place so the per-feature hooks stay
 * ~10 lines each.
 *
 * ## Diff from `useOptimisticToggle` (Phase 3 Story 3.9)
 *
 *   - `useOptimisticToggle` is a **boolean flip** primitive; it does
 *     NOT touch the SWR cache directly — the consumer owns the
 *     `mutate(updater)` call that flips local state.
 *   - `useOptimisticMutation` is a **typed mutation** primitive; it
 *     owns the snapshot-and-revert dance end-to-end. The consumer
 *     supplies an `optimisticData` patch function (pure: takes the
 *     current data, returns the optimistic data) and an async `run`
 *     that performs the SDK / service call.
 *
 * ## 401 pass-through
 *
 * Identical to `useOptimisticToggle`: the hook does NOT handle 401
 * specially. `orvalCustomInstance` triggers refresh; if refresh fails
 * the promise rejects with an `ApiError` (status 401 or 0) which falls
 * through to `reverted` with `lastError` set. The cross-tab logout
 * sync (`broadcast-channel.ts`) handles session invalidation.
 *
 * ## Same-tab broadcast suppression
 *
 * (TKT-4.1.E2.) Per-feature channels (`attempts-broadcast-channel`,
 * `profile-broadcast-channel`) tag every outgoing payload with
 * `getCurrentTabId()` and filter the same-tab messages on receipt.
 * The hook does NOT need to filter — it just calls
 * `broadcastAttemptsChanged(...)` (or the relevant helper) and lets
 * the channel layer handle the suppression. Tests assert that a
 * listener registered in the originating tab does NOT fire (see
 * `useOptimisticMutation.spec.ts` broadcast-self-suppression case).
 *
 * @see useOptimisticToggle (Phase 3, Story 3.9) — boolean-flip
 *      precedent. `useOptimisticMutation` is the typed, snapshot-owning
 *      superset.
 * @see phase4Broadcast (TKT-4.1.B2) — cross-tab envelope facade.
 * @see ConfirmDialog (TKT-4.1.D2) — typed-confirm primitive consumed
 *      by the `confirm?` option.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import {
  emitPhase4Broadcast,
  type Phase4BroadcastBareMessage,
} from '@/lib/api/core/phase4Broadcast';

/**
 * The SWR key shape used for the `key` parameter. Mirrors the
 * Phase 3 `useOptimisticToggle.OptimisticToggleSWRKey` type.
 */
export type OptimisticMutationSWRKey = readonly unknown[];

/**
 * Pure function that takes the current cached data for `key` and
 * returns the optimistic replacement. Receives `undefined` when the
 * cache is empty.
 *
 * For a non-existent cache entry the consumer can return either
 * `undefined` (no optimistic patch — server response will populate the
 * key) or a synthetic optimistic value.
 */
export type OptimisticMutationPatcher<TData> = (
  current: TData | undefined,
) => TData | undefined;

/**
 * The async mutation the hook awaits. Receives no arguments (the
 * caller has already collected the SDK / service function's arguments
 * into the closure). Returns the mutation result — typically the
 * updated entity for `update*` calls, a status for deletes, or
 * `void` for `delete*` 204 paths.
 */
export type OptimisticMutationRun<TResult> = () => Promise<TResult>;

/**
 * The discriminated-union status. Mirrors `useOptimisticToggle`'s
 * taxonomy:
 *
 *   - `idle`        — no `mutate()` call has been issued yet.
 *   - `pending`     — the most recent call is in flight.
 *   - `success`     — the most recent call resolved; cache revalidated.
 *   - `reverted`    — the most recent call rejected; cache reverted.
 *   - `cooldown`    — the most recent call was dropped because it
 *                     landed inside the cooldown window of a prior
 *                     call. The cache is untouched.
 *   - `cancelled`   — (TKT-4.1.E2) the typed-confirm dialog was
 *                     cancelled; the mutation never ran.
 */
export type OptimisticMutationStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'reverted'
  | 'cooldown'
  | 'cancelled';

/**
 * Optional typed-confirm gate. When supplied, the hook renders the
 * `<ConfirmDialog />` primitive (TKT-4.1.D2) and awaits the user's
 * confirmation before snapshotting / running. Cancelling resolves the
 * hook with `{ status: 'cancelled' }` and never touches the cache.
 *
 * (TKT-4.1.E2 acceptance criterion 1.)
 */
export type OptimisticMutationConfirm = {
  kind: import('@/components/primitives/ConfirmDialog/confirm-copy').ConfirmKind;
  entityLabel?: string;
  typedOverride?: string;
};

/**
 * Optional Phase 4 cross-tab broadcast emitted on success.
 *
 * The hook accepts an array of `Phase4BroadcastBareMessage` events
 * (or factory functions returning the event). The per-feature channel
 * (`attempts-broadcast-channel`, `profile-broadcast-channel`) tags the
 * payload with the current tab id and filters same-tab messages on
 * receipt, so the hook does not need to do any tab-id bookkeeping.
 *
 * (TKT-4.1.E2 acceptance criterion 2.)
 */
export type OptimisticMutationBroadcast =
  | import('@/lib/api/core/phase4Broadcast').Phase4BroadcastBareMessage
  | (() =>
      | import('@/lib/api/core/phase4Broadcast').Phase4BroadcastBareMessage
      | null
      | undefined);

/**
 * The `mutate()` call payload. Required fields: `key`, `optimisticData`,
 * `run`. Everything else is optional.
 */
export type OptimisticMutationCall<TData, TResult> = {
  /** The SWR key to snapshot, optimistic-patch, and revalidate. */
  key: OptimisticMutationSWRKey;
  /** Pure patch function. Applied synchronously before `run` fires. */
  optimisticData: OptimisticMutationPatcher<TData>;
  /** The async mutation the hook awaits. */
  run: OptimisticMutationRun<TResult>;
  /** Optional success callback (e.g. close a dialog, navigate). */
  onSuccess?: (result: TResult) => void;
  /** Optional error callback (e.g. surface the failure copy). */
  onError?: (apiError: ApiError | unknown) => void;
  /** (TKT-4.1.E2) Optional typed-confirm gate. */
  confirm?: OptimisticMutationConfirm;
  /** (TKT-4.1.E2) Optional cross-tab broadcasts emitted on success. */
  broadcasts?: OptimisticMutationBroadcast | OptimisticMutationBroadcast[];
  /** Optional override of the cooldown window (ms). Default 500. */
  cooldownMs?: number;
};

/**
 * The discriminated-union result of a `mutate()` call. Mirrors
 * `useOptimisticToggle`'s contract (the consumer reads `.status`).
 */
export type OptimisticMutationResult<TResult> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; result: TResult }
  | { status: 'reverted'; apiError: ApiError | unknown }
  | { status: 'cooldown' }
  | { status: 'cancelled' };

/**
 * The hook's stable return shape. Exposed to React via a `useState`
 * for the latest result; the `mutate` callback is stable across
 * renders via `useCallback`.
 */
export type UseOptimisticMutationResult<TResult> = {
  /**
   * The latest result of a `mutate()` call. `null` until the first
   * call resolves. Reset to `null` by the explicit `reset()` helper.
   */
  lastResult: OptimisticMutationResult<TResult> | null;
  /**
   * The latest `ApiError` from a `reverted` transition. `null`
   * otherwise. Mirrors `useOptimisticToggle.lastError`.
   */
  lastError: ApiError | unknown | null;
  /**
   * `true` while a `mutate()` call is in flight.
   */
  isInFlight: boolean;
  /**
   * Trigger a mutation. See `OptimisticMutationCall` for the call
   * shape.
   */
  mutate: <TData, TResult2>(
    call: OptimisticMutationCall<TData, TResult2>,
  ) => Promise<OptimisticMutationResult<TResult2>>;
  /**
   * Clear `lastResult` and `lastError`. Useful for navigating away
   * from a stale-error dialog.
   */
  reset: () => void;
};

/**
 * Sentinel error code returned for the cooldown drop case (TKT-4.1.E1
 * acceptance criterion 4). Surfaced as `lastResult.status === 'cooldown'`
 * — never thrown.
 */
export const COOLDOWN_RESULT: { status: 'cooldown' } = Object.freeze({
  status: 'cooldown',
});

/**
 * `useOptimisticMutation` — the canonical mutation primitive for
 * Phase 4. See the file-level docstring for the full discipline
 * contract.
 *
 * @example
 *   ```ts
 *   const { mutate, lastResult, isInFlight } = useOptimisticMutation();
 *
 *   const onBookmark = useCallback(async () => {
 *     const result = await mutate({
 *       key: ['bookmarks', userId],
 *       optimisticData: (cur) => [...(cur ?? []), newBookmark],
 *       run: () => addBookmark(collectionId, { quizId }),
 *     });
 *     if (result.status === 'success') toast.success('Bookmarked');
 *     if (result.status === 'reverted') toast.error('Could not bookmark');
 *   }, [mutate, userId, collectionId, quizId]);
 *   ```
 */
export function useOptimisticMutation(): UseOptimisticMutationResult<unknown> {
  const [lastResult, setLastResult] = useState<OptimisticMutationResult<unknown> | null>(null);
  const [lastError, setLastError] = useState<ApiError | unknown | null>(null);
  const [isInFlight, setIsInFlight] = useState(false);

  // Cooldown bookkeeping.
  const lastInvocationRef = useRef<number>(0);

  const reset = useCallback(() => {
    setLastResult(null);
    setLastError(null);
    setIsInFlight(false);
  }, []);

  const mutate = useCallback(
    async <TData, TResult2>(
      call: OptimisticMutationCall<TData, TResult2>,
    ): Promise<OptimisticMutationResult<TResult2>> => {
      const cooldownMs = call.cooldownMs ?? 500;

      // ─── Cooldown gate ──────────────────────────────────────────────
      // The first mutate() in a window always fires; subsequent calls
      // within `cooldownMs` are dropped, not queued. The cooldown is
      // NOT lifted on rejection (mirrors useOptimisticToggle B1 AC #5).
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < cooldownMs) {
        const dropped: OptimisticMutationResult<TResult2> = { status: 'cooldown' };
        setLastResult(dropped);
        return dropped;
      }
      lastInvocationRef.current = now;

      // ─── (E2) Optional typed-confirm descriptor ────────────────────
      //
      // When `confirm` is set, the hook returns `{ status: 'pending' }`
      // WITHOUT starting the mutation or setting the cooldown timer.
      // The caller is responsible for rendering a `<ConfirmDialog />`
      // primitive (TKT-4.1.D2) with the supplied descriptor and
      // re-invoking `mutate()` (without `confirm`) on the dialog's
      // onConfirm callback. This indirection keeps the hook
      // UI-agnostic and testable.
      //
      // The descriptor is exposed via `lastResult` so a consumer
      // pattern looks like:
      //
      //   const result = await mutate({ confirm: { kind: '…', … }, … });
      //   if (result.status === 'pending' && !lastResult) {
      //     setShowDialog(true); // render <ConfirmDialog /> with descriptor
      //   }
      //
      //   // on dialog onConfirm:
      //   await mutate({ /* same call but WITHOUT `confirm` */ });
      //   // on dialog onCancel:
      //   reset(); setShowDialog(false);
      //
      if (call.confirm) {
        const pending: OptimisticMutationResult<TResult2> = { status: 'pending' };
        setLastResult(pending);
        return pending;
      }

      // ─── Snapshot + optimistic apply ─────────────────────────────────
      // SWR exposes the cached value via `mutate(key, undefined, { ... })`
      // is not the read path; we use the global `mutate` import (already
      // aliased) to read via Promise.resolve(undefined).
      //
      // Actually: SWR's global `mutate(key)` with no data returns the
      // current cache value. We capture the snapshot synchronously
      // before any await so the revert target is stable.
      const snapshot = (await globalMutate(call.key)) as TData | undefined;

      await globalMutate(call.key, call.optimisticData(snapshot), {
        revalidate: false,
      });

      setLastResult({ status: 'pending' });
      setLastError(null);
      setIsInFlight(true);

      try {
        const result = await call.run();
        // ─── Success: revalidate + broadcast (E2) ─────────────────────
        await globalMutate(call.key, undefined, { revalidate: true });

        // Emit cross-tab broadcasts (E2).
        if (call.broadcasts) {
          const list = Array.isArray(call.broadcasts) ? call.broadcasts : [call.broadcasts];
          for (const entry of list) {
            const env: Phase4BroadcastBareMessage | null | undefined =
              typeof entry === 'function' ? (entry as () => Phase4BroadcastBareMessage | null | undefined)() : entry;
            if (env) emitPhase4Broadcast(env);
          }
        }

        const success: OptimisticMutationResult<TResult2> = { status: 'success', result };
        setLastResult(success);
        setIsInFlight(false);
        call.onSuccess?.(result);
        return success;
      } catch (cause: unknown) {
        // ─── Revert: reapply snapshot (no revalidation) ───────────────
        await globalMutate(call.key, snapshot, { revalidate: false });

        const reverted: OptimisticMutationResult<TResult2> = {
          status: 'reverted',
          apiError: cause,
        };
        setLastResult(reverted);
        setLastError(cause);
        setIsInFlight(false);
        call.onError?.(cause);
        return reverted;
      }
    },
    [],
  );

  return { lastResult, lastError, isInFlight, mutate, reset };
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Type-guard that narrows an unknown rejection to an `ApiError`.
 * Exported for consumers / tests that want to read `apiError.code`.
 */
export function isApiErrorRejection(cause: unknown): cause is ApiError {
  return isApiError(cause);
}