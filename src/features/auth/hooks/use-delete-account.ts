'use client';

/**
 * `useDeleteAccount` — one-shot account-deletion hook.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source tickets: 2.10.T12 (hook), 2.10.T13 (revalidation gate).
 *
 * ## Purpose
 *
 * Owns the destructive-deletion lifecycle:
 *
 *   - the single-pending submission discipline (a double-click on
 *     the confirm button cannot fire two DELETE requests),
 *   - typed-intent confirmation enforcement (the user must type
 *     `DELETE` exactly),
 *   - current-password requirement,
 *   - error classification through `mapDeletionError()` (T3),
 *   - the revalidation gate before a retry is allowed after
 *     `uncertain` or `conflict` (T13),
 *   - the terminal-coordinator invocation (T14) on authoritative
 *     success,
 *   - the in-memory form-state reset on every error/close path
 *     (T11 discipline).
 *
 * Counterpart to `useVerifyPassword` (2.9.T6), `useChangePassword`
 * (2.9.T14), and `useRevokeSession` (2.8.T17).
 *
 * ## Single-pending discipline
 *
 * While `state.kind === 'pending' | 'cleanup' | 'completed'`, a
 * second `submit()` invocation is dropped. The first request's
 * in-flight promise is returned so the caller's `await` resolves
 * with the same resolution. This mirrors the reducer pattern in
 * `useRevokeSession` and the `inFlightRef` pattern in
 * `useVerifyPassword`.
 *
 * ## Typed-intent confirmation
 *
 * The user must type `DELETE` (uppercase) into the modal's typed
 * confirmation input. The hook accepts `typedConfirmation` as a
 * required argument to `submit()` and rejects locally if it does
 * not match. The accepted token mirrors `password-copy`'s
 * destructive-deletion discipline and is the canonical placeholder
 * from `deletion-copy.ts` (`COPY_KEYS.deletion.typed.placeholder`).
 *
 * The literal `DELETION_INTENT_TOKEN` is exported below so the
 * modal component can render the placeholder / validate without
 * duplicating the literal.
 *
 * ## Password hygiene
 *
 * The hook does NOT store `password` or `typedConfirmation` in
 * state, refs, or module-level closures. The values go to the SDK
 * synchronously and out of scope on function return. The returned
 * state never carries the password or the typed confirmation.
 *
 * ## Retry gate (T13)
 *
 * After an `uncertain` or `conflict` outcome the hook enters a
 * "retry gate" sub-state: `state.kind === 'idle'` with
 * `state.lastRevalidation === null`. A second `submit()` is
 * rejected with the `REQUIRES_REVALIDATION` sentinel return value
 * until the user calls `revalidate()`. `revalidate()` issues a
 * `GET /auth/me` read and updates `lastRevalidation`:
 *
 *   - `'exists'`          → a fresh `submit()` is allowed; the
 *                           user must re-type the password and
 *                           typed confirmation.
 *   - `'already_deleted'` → the hook transitions through `cleanup`
 *                           → `completed` via the safe terminal
 *                           path.
 *   - `'disabled'`        → the hook stays `idle` and surfaces the
 *                           disabled-banner copy.
 *   - `'unknown'`         → the hook stays `idle` and offers a
 *                           safe retry of `revalidate()` (NOT a
 *                           delete retry).
 *
 * ## Finalization ordering
 *
 * On authoritative success (2xx), the hook:
 *
 *   1. Transitions to `'cleanup'` (renders the cleanup copy).
 *   2. Awaits the T14 coordinator, which:
 *
 *        - sets the terminal marker,
 *        - clears auth markers (T9),
 *        - clears caches (T10),
 *        - clears persisted state (T11),
 *        - broadcasts `LOGGED_OUT` for cross-tab convergence,
 *        - calls the supplied `replaceHistory` thunk.
 *
 *   3. Transitions to `'completed'`. The hook returns a
 *      `Promise<UseDeleteAccountResult>` that resolves once
 *      `cleanup` is in flight (the modal uses the result to
 *      schedule the actual navigation via `router.replace`).
 *
 * ## No secret in returned state
 *
 * The hook's returned `state` never includes `password` or
 * `typedConfirmation`. The unit suite (planned in 2.10.T25)
 * asserts this via a reducer simulation.
 *
 * @see DeletionState (2.10.T8)
 * @see runDeletionFinalization (2.10.T14)
 * @see mapDeletionError (2.10.T3)
 * @see revalidateAccountExists (2.10.T13)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  deleteAccount as defaultDeleteAccount,
} from '@/features/auth/services/auth.service';
import {
  mapDeletionError,
  isAuthTerminalDeletionError,
  isDeletionConflict,
  isDeletionNotFound,
  isDeletionUncertain,
  isDeletionValidation,
  isInvalidCurrentPasswordDeletion,
  type DeletionErrorClassification,
} from '@/features/auth/errors/deletion-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { DeleteAccountResponseDto } from '@/lib/api';
import {
  runDeletionFinalization,
} from '@/features/auth/lifecycle/deletion-finalization';
import {
  revalidateAccountExists,
  type DeletionAccountExistence,
} from '@/features/auth/lifecycle/deletion-revalidation';
import {
  clearSensitiveDeletionFormValues,
  type DeletionFormSetters,
} from '@/features/auth/lifecycle/deletion-persisted-state';
import {
  initialDeletionState,
  isTerminalDeletionState,
  type DeletionState,
  type DeletionStateError,
} from '@/features/auth/types/deletion-state';

/**
 * The exact typed-intent token the user must enter. Mirrors the
 * `typed.placeholder` in `deletion-copy.ts`. Exported so the modal
 * component can validate without re-declaring the literal.
 */
export const DELETION_INTENT_TOKEN = 'DELETE' as const;

/**
 * Result of a `submit()` call. Discriminated union so the modal
 * can branch without try/catch gymnastics.
 *
 *   - `'success'`              — backend committed deletion; cleanup
 *                                is in flight or completed.
 *   - `'invalid_current'`      — wrong password; modal clears the
 *                                password field, preserves intent.
 *   - `'conflict'`             — backend refused; revalidation
 *                                required before retry.
 *   - `'uncertain'`            — network / 5xx / 429 / unknown;
 *                                revalidation required.
 *   - `'auth_terminal'`        — shared refresh policy owns this;
 *                                modal renders the session-expired
 *                                banner.
 *   - `'validation'`           — class-validator rejected the
 *                                payload; modal renders field errors.
 *   - `'already_deleted'`      — account is gone; cleanup path runs.
 *   - `'rejected_local'`       — empty password / wrong typed token /
 *                                requires revalidation; modal renders
 *                                the field-level copy.
 *   - `'deduped'`              — a request was already in flight;
 *                                the second `submit()` was dropped.
 */
export type UseDeleteAccountSubmitResult =
  | { kind: 'success'; message: string }
  | { kind: 'invalid_current'; cause: ApiError | unknown }
  | { kind: 'conflict'; cause: ApiError | unknown }
  | { kind: 'uncertain'; cause: ApiError | unknown }
  | { kind: 'auth_terminal'; cause: ApiError | unknown }
  | { kind: 'validation'; cause: ApiError | unknown; validationMessages: string[] }
  | { kind: 'already_deleted'; cause?: ApiError | unknown }
  | { kind: 'rejected_local'; reason: 'empty_password' | 'intent_mismatch' | 'requires_revalidation' }
  | { kind: 'deduped' };

export interface UseDeleteAccountResult {
  /**
   * The discriminated lifecycle state. See `DeletionState`
   * (2.10.T8) for the full shape.
   */
  state: DeletionState;
  /**
   * Fire a deletion request. Requires non-empty `password` and an
   * exact-match `typedConfirmation`. Returns a discriminated union
   * the modal uses to render the right copy.
   */
  submit: (
    password: string,
    typedConfirmation: string,
  ) => Promise<UseDeleteAccountSubmitResult>;
  /**
   * Issue the account-state revalidation read. After an
   * `uncertain` or `conflict` outcome, the hook blocks the next
   * `submit()` until this resolves. The modal wires the
   * "Re-check account state" CTA to this method.
   */
  revalidate: () => Promise<DeletionAccountExistence | null>;
  /**
   * Reset the hook to `'idle'` and clear sensitive form values via
   * the supplied setters (T11 discipline).
   */
  reset: (formSetters?: Partial<DeletionFormSetters>) => void;
}

/**
 * Dependency-injected fetcher. Tests pass a stub for the fields
 * they want to control; production can override only `finalize`
 * (e.g. to inject the history-replacement thunk) and let the
 * others default to the auth-service wrappers.
 *
 * Every field is optional. The hook falls back to
 * `defaultDeleteAccountDeps` for any field not supplied.
 */
export interface UseDeleteAccountDeps {
  deleteAccount?: (dto: { password: string }) => Promise<DeleteAccountResponseDto>;
  /**
   * Finalization coordinator. The hook calls this AFTER the
   * backend confirms deletion (2xx). Tests inject a stub that
   * records the call.
   */
  finalize?: () => Promise<{ alreadyFinalized: boolean }>;
  /**
   * Revalidation helper. Tests inject a stub returning a synthetic
   * `'exists' | 'already_deleted' | 'disabled' | 'unknown'`.
   */
  revalidateAccountExists?: typeof revalidateAccountExists;
}

export const defaultDeleteAccountDeps: UseDeleteAccountDeps = {
  deleteAccount: defaultDeleteAccount,
  finalize: async () => {
    const result = await runDeletionFinalization();
    return { alreadyFinalized: result.alreadyFinalized };
  },
  revalidateAccountExists,
};

/**
 * Build a `DeletionStateError` from an unknown thrown value. Pure;
 * the mapper collapses the cause into a classification.
 */
function toDeletionStateError(cause: unknown): DeletionStateError {
  if (cause instanceof ApiError) {
    return {
      classification: mapDeletionError({
        code: String(cause.code ?? ''),
        status: Number(cause.status ?? 0),
        validationMessages: Array.isArray(cause.validationMessages)
          ? cause.validationMessages
          : [],
      }),
      cause,
    };
  }
  // Unknown shape — fall back to `'uncertain'` per mapper's
  // conservative default.
  return {
    classification: mapDeletionError({ code: '', status: 0 }),
    cause,
  };
}

/**
 * `useDeleteAccount(deps?)` — see file header.
 *
 * @param deps - Optional fetcher injection (tests only)
 */
export function useDeleteAccount(
  deps: UseDeleteAccountDeps = defaultDeleteAccountDeps,
): UseDeleteAccountResult {
  const [state, setState] = useState<DeletionState>(initialDeletionState);

  // Resolve every dependency against `defaultDeleteAccountDeps`
  // so callers can supply just the fields they want to override
  // (typically `finalize` for history replacement, or test stubs).
  // Memoized so the downstream callbacks see a stable reference
  // and do not invalidate their dependency arrays on every render.
  const resolvedDeps: Required<UseDeleteAccountDeps> = useMemo(
    () => ({
      deleteAccount:
        deps.deleteAccount ?? defaultDeleteAccountDeps.deleteAccount!,
      finalize: deps.finalize ?? defaultDeleteAccountDeps.finalize!,
      revalidateAccountExists:
        deps.revalidateAccountExists ??
        defaultDeleteAccountDeps.revalidateAccountExists!,
    }),
    [deps],
  );

  // Track the in-flight submission promise so a second concurrent
  // `submit()` returns the same promise (mirrors `useVerifyPassword`
  // 2.9.T6). We also store a one-shot sentinel for the
  // "deduped, no in-flight" race.
  const inFlightRef = useRef<Promise<UseDeleteAccountSubmitResult> | null>(
    null,
  );

  /**
   * Fire the DELETE request. Validates locally first; on a
   * backend error, classifies via the mapper and transitions to
   * the appropriate state.
   */
  const submit = useCallback(
    async (
      password: string,
      typedConfirmation: string,
    ): Promise<UseDeleteAccountSubmitResult> => {
      // Single-pending discipline: drop concurrent submissions.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }
      // Terminal discipline: refuse submissions after cleanup or
      // completion. The modal renders the public-landing copy; the
      // submit button is no longer visible.
      if (isTerminalDeletionState(state)) {
        return { kind: 'deduped' };
      }

      // Local validation — does NOT touch the network.
      if (password.length === 0) {
        setState((prev) => {
          if (prev.kind !== 'idle') return prev;
          return {
            ...prev,
            error: {
              classification: mapDeletionError({ code: '', status: 0 }),
              cause: null,
            },
          };
        });
        return { kind: 'rejected_local', reason: 'empty_password' };
      }
      if (typedConfirmation !== DELETION_INTENT_TOKEN) {
        setState((prev) => {
          if (prev.kind !== 'idle') return prev;
          return {
            ...prev,
            error: {
              classification: mapDeletionError({ code: '', status: 0 }),
              cause: null,
            },
          };
        });
        return { kind: 'rejected_local', reason: 'intent_mismatch' };
      }

      // Retry-gate discipline: a prior `uncertain` or `conflict`
      // outcome requires revalidation before another attempt.
      // The error lives on `idle` (preserved after `invalid_current`
      // / `validation`) and on `uncertain` (the post-conflict /
      // post-network-failure state). Both branches must gate.
      const hasRetryableError =
        (state.kind === 'idle' || state.kind === 'uncertain') &&
        state.error !== null;
      if (hasRetryableError) {
        const c = state.error.classification;
        const requiresRevalidation =
          isDeletionUncertain(c) || isDeletionConflict(c);
        if (requiresRevalidation && state.lastRevalidation === null) {
          return { kind: 'rejected_local', reason: 'requires_revalidation' };
        }
      }

      // Move to `pending` and capture the in-flight promise so a
      // concurrent `submit()` returns the same promise.
      const inFlight = (async (): Promise<UseDeleteAccountSubmitResult> => {
        setState((prev) => ({
          kind: 'pending',
          inFlight: Promise.resolve(undefined),
          error: null,
          lastRevalidation:
            prev.kind === 'idle' ? prev.lastRevalidation : null,
        }));

        let response: DeleteAccountResponseDto;
        try {
          response = await resolvedDeps.deleteAccount({ password });
        } catch (cause: unknown) {
          const error = toDeletionStateError(cause);
          const c = error.classification;

          // `not_found` — the account is already gone. Run the
          // safe terminal cleanup path so this tab reflects the
          // deletion even though the request itself failed.
          if (isDeletionNotFound(c)) {
            setState({
              kind: 'cleanup',
              isFinalized: false,
              error: null,
              lastRevalidation: null,
            });
            await resolvedDeps.finalize();
            setState({
              kind: 'completed',
              isFinalized: true,
              error: null,
              lastRevalidation: null,
            });
            return { kind: 'already_deleted', cause };
          }

          // `auth_terminal` — the shared refresh policy owns the
          // path; the hook just marks the state.
          if (isAuthTerminalDeletionError(c)) {
            setState((prev) => ({
              kind: 'uncertain',
              error,
              lastRevalidation:
                prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
            return { kind: 'auth_terminal', cause };
          }

          // `invalid_current` — preserve the typed intent so the
          // user only re-enters the password.
          if (isInvalidCurrentPasswordDeletion(c)) {
            setState((prev) => ({
              kind: 'idle',
              error,
              lastRevalidation:
                prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
            return { kind: 'invalid_current', cause };
          }

          // `validation` — preserve typed intent; the modal renders
          // the field-level messages.
          if (isDeletionValidation(c)) {
            setState((prev) => ({
              kind: 'idle',
              error,
              lastRevalidation:
                prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
            return {
              kind: 'validation',
              cause,
              validationMessages: c.validationMessages,
            };
          }

          // `uncertain` — block retry until revalidation completes.
          if (isDeletionUncertain(c)) {
            setState({
              kind: 'uncertain',
              error,
              lastRevalidation: null,
            });
            return { kind: 'uncertain', cause };
          }

          // `conflict` — block retry until revalidation completes.
          if (isDeletionConflict(c)) {
            setState({
              kind: 'uncertain',
              error,
              lastRevalidation: null,
            });
            return { kind: 'conflict', cause };
          }

          // Unknown classification — treat as uncertain. The mapper
          // already collapses to `uncertain` in its fallback, but
          // we keep the branch for defensive completeness.
          setState({
            kind: 'uncertain',
            error,
            lastRevalidation: null,
          });
          return { kind: 'uncertain', cause };
        }

        // Authoritative success. Transition through cleanup →
        // completed so a concurrent render cannot win the race.
        setState({
          kind: 'cleanup',
          isFinalized: false,
          error: null,
          lastRevalidation: null,
        });

        try {
          await resolvedDeps.finalize();
        } catch {
          // Coordinator failures are best-effort and already
          // collected into the result. We swallow here because the
          // backend already committed deletion; the UI MUST proceed
          // to `completed` regardless of cleanup errors.
        }

        setState({
          kind: 'completed',
          isFinalized: true,
          error: null,
          lastRevalidation: null,
        });

        return { kind: 'success', message: response.message };
      })();

      inFlightRef.current = inFlight;
      try {
        return await inFlight;
      } finally {
        // Clear the tracker on resolution so the next user-driven
        // submission can run.
        if (inFlightRef.current === inFlight) {
          inFlightRef.current = null;
        }
      }
    },
    [resolvedDeps, state],
  );

  /**
   * Issue the account-state revalidation read. Updates
   * `lastRevalidation` and, on `'already_deleted'`, transitions
   * through the safe terminal path.
   */
  const revalidate = useCallback(async (): Promise<
    DeletionAccountExistence | null
  > => {
    const result = await resolvedDeps.revalidateAccountExists();

    if (result.kind === 'error') {
      // Defensive: the helper never throws and never returns
      // `'error'`; treat as unknown.
      setState((prev) => {
        if (prev.kind !== 'idle' && prev.kind !== 'uncertain') return prev;
        return { ...prev, lastRevalidation: 'unknown' };
      });
      return 'unknown';
    }

    const outcome = result.outcome;

    setState((prev) => {
      if (prev.kind === 'idle') {
        return { ...prev, lastRevalidation: outcome };
      }
      if (prev.kind === 'uncertain') {
        return { ...prev, lastRevalidation: outcome };
      }
      return prev;
    });

    // `already_deleted` triggers the safe terminal path even
    // though we never received a 2xx on the DELETE.
    if (outcome === 'already_deleted') {
      setState({
        kind: 'cleanup',
        isFinalized: false,
        error: null,
        lastRevalidation: 'already_deleted',
      });
      try {
        await resolvedDeps.finalize();
      } catch {
        // best-effort
      }
      setState({
        kind: 'completed',
        isFinalized: true,
        error: null,
        lastRevalidation: 'already_deleted',
      });
    }

    return outcome;
  }, [resolvedDeps]);

  /**
   * Reset the hook to `'idle'` and clear sensitive form values.
   * Called by the modal on close, on cancellation, and on unmount.
   */
  const reset = useCallback(
    (formSetters?: Partial<DeletionFormSetters>): void => {
      if (formSetters) {
        clearSensitiveDeletionFormValues(formSetters);
      }
      setState(initialDeletionState);
      inFlightRef.current = null;
    },
    [],
  );

  return useMemo(
    () => ({ state, submit, revalidate, reset }),
    [state, submit, revalidate, reset],
  );
}

/**
 * Re-export for callers that prefer the redux-style helper over
 * the React hook. The reducer is exposed so tests can simulate
 * state transitions without rendering the modal.
 */
export type { DeletionErrorClassification };
