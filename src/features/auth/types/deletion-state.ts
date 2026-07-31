/**
 * Account-deletion lifecycle state model.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T8.
 *
 * ## Purpose
 *
 * Provides the discriminated union the destructive deletion hook
 * (`useDeleteAccount`, 2.10.T12) exposes to the modal component
 * (2.10.T15). The state shape is intentionally narrow: a small set
 * of UI-facing kinds plus the structured error classification
 * (from `mapDeletionError`).
 *
 * ## Why this is a discriminated union (not a status string)
 *
 * The earlier epic hooks (`useVerifyPassword`, `useChangePassword`,
 * `useRevokeSession`) use a `'idle' | 'pending' | 'success' | 'error'`
 * status string. Deletion needs more states than that:
 *
 *   - `idle`           — modal is open, no submission yet
 *   - `pending`        — DELETE request is in flight
 *   - `uncertain`      — response was lost / 5xx / 429 / unknown;
 *                        the deletion MIGHT have committed server-side
 *                        and MUST NOT be rendered as success
 *   - `cleanup`        — backend committed deletion, local cleanup is
 *                        running (auth markers, caches, persisted state,
 *                        broadcast)
 *   - `completed`      — local cleanup is done, the tab is terminal
 *                        (public navigation only)
 *
 * Folding `uncertain` into `error` would tempt a future caller to
 * render "your account was deleted" copy after a timeout. Folding
 * `cleanup` into `success` would tempt a caller to call `logout()`
 * after the backend returned. Keeping each state separate makes
 * those misuse paths impossible at the type level.
 *
 * ## Why `error` is intentionally absent
 *
 * The mapper (2.10.T3) returns `invalid_current`, `conflict`,
 * `not_found`, `auth_terminal`, `validation`, and `uncertain`. The
 * only one that maps to a *non-fatal, retryable* modal state is
 * `invalid_current` (and `validation` for client-side input errors);
 * these are surfaced as `error.classification.kind === 'invalid_current'`
 * while `status === 'idle'` so the modal stays open with the password
 * field ready for re-entry. All other mapper kinds either transition
 * the hook to `uncertain` (network / 5xx / 429), `completed` (for
 * `not_found` only — the account is gone), or `auth_terminal` (the
 * shared refresh/final-logout policy owns the path).
 *
 * ## No secret fields
 *
 * The discriminated union never carries `password` or `typedConfirmation`.
 * Those live in the modal component's local React state and are
 * cleared by the modal discipline (2.10.T19), not surfaced through
 * the hook.
 *
 * ## Exhaustiveness
 *
 * The union is `kind`-discriminated; an exhaustive `switch` over
 * `state.kind` covers every branch. The TypeScript `never` check is
 * applied in `assertNeverExhaustiveDeletionState` below so future
 * state additions surface as a compile-time error.
 */

import type { ApiError } from "@/lib/api/core/ApiError";
import type { DeletionErrorClassification } from "@/features/auth/errors/deletion-error-mapper";
import { DeletionAccountExistence } from "../lifecycle/deletion-revalidation";

/**
 * The five lifecycle states the deletion hook exposes.
 */
export type DeletionState =
  | DeletionIdleState
  | DeletionPendingState
  | DeletionUncertainState
  | DeletionCleanupState
  | DeletionCompletedState;

/**
 * `idle` — modal is open; the user has not submitted (or has reset
 * after an `invalid_current` error). The hook will accept a new
 * `submit()` invocation.
 */
export interface DeletionIdleState {
  readonly kind: "idle";
  /**
   * Optional classified error from the previous attempt. The hook
   * keeps this slot populated across `idle` → `idle` transitions
   * (so the modal can render the field-level error banner without
   * re-fetching), and clears it on a fresh `reset()` or successful
   * submission.
   */
  readonly error: DeletionStateError | null;
  /**
   * Optional revalidation result from a prior `uncertain` /
   * `conflict` outcome. Preserved across `idle` so the modal can
   * render "your account is gone" copy without re-fetching. Cleared
   * on `reset()`.
   */
  readonly lastRevalidation: DeletionAccountExistence | null;
}

/**
 * `pending` — `DELETE /auth/account` is in flight. The modal must
 * disable all destructive controls and ignore cancel/close. The
 * hook refuses a second `submit()` while in this state.
 */
export interface DeletionPendingState {
  readonly kind: "pending";
  /**
   * The submission promise that produced this state. Preserved so a
   * second concurrent `submit()` call returns the same promise
   * instead of starting a duplicate request.
   */
  readonly inFlight: Promise<unknown>;
  readonly error: null;
  readonly lastRevalidation: DeletionAccountExistence | null;
}

/**
 * `uncertain` — the request resolved in a way that does not prove
 * deletion committed or failed:
 *
 *   - network failure (`status 0`),
 *   - rate limit (`429`),
 *   - server error (`5xx`),
 *   - unknown error code,
 *   - `AUTH_DELETION_FAILED` (concurrent / already-deleted — the
 *     backend explicitly told us it could not commit).
 *
 * The hook MUST NOT transition to `completed` from `uncertain`
 * without a successful `revalidateAccountExists()` call that
 * proves the account no longer exists.
 *
 * The modal must render the "deletion not confirmed" copy and offer
 * a revalidation CTA; it must NEVER render success copy here.
 */
export interface DeletionUncertainState {
  readonly kind: "uncertain";
  /**
   * Classified error. `kind` here is `conflict | uncertain |
   * auth_terminal` from the mapper. `auth_terminal` is rare (the
   * endpoint is in `AUTH_PATHS`, so a 401 → no refresh → 401
   * straight back) but is treated the same way as the others:
   * the user must revalidate before the hook can transition.
   */
  readonly error: DeletionStateError;
  readonly lastRevalidation: DeletionAccountExistence | null;
}

/**
 * `cleanup` — backend committed deletion; the local coordinator is
 * running auth-marker / cache / persisted-state / broadcast cleanup.
 *
 * The modal must render the "we are cleaning up" copy. No destructive
 * controls are visible. A second `submit()` is silently dropped.
 */
export interface DeletionCleanupState {
  readonly kind: "cleanup";
  /**
   * Whether the coordinator already ran. Used by the cross-tab
   * receiver (2.10.T24) and the protected-route guard (2.10.T21)
   * to short-circuit re-entry attempts while cleanup is in flight.
   */
  readonly isFinalized: boolean;
  readonly error: null;
  readonly lastRevalidation: DeletionAccountExistence | null;
}

/**
 * `completed` — cleanup finished (or was a no-op because the
 * coordinator was already idempotent). The hook refuses any further
 * submission. The modal renders the public-redirect copy and the
 * page navigates to the public landing route.
 *
 * This state can ONLY be entered from `cleanup` (after the
 * coordinator completes), from `uncertain` (after a revalidation
 * proves the account is gone), or from `idle` (when the initial
 * revalidation discovers the account is already gone — the
 * `not_found` mapper branch).
 */
export interface DeletionCompletedState {
  readonly kind: "completed";
  readonly isFinalized: true;
  readonly error: null;
  readonly lastRevalidation: DeletionAccountExistence | null;
}

/**
 * Structured error slot. Mirrors the pattern from `useVerifyPassword`
 * and `useRevokeSession`: a classified `kind` for UI branching, plus
 * the raw `cause` for logging / tests.
 */
export interface DeletionStateError {
  classification: DeletionErrorClassification;
  cause: ApiError | unknown;
}

/**
 * Initial state for the hook reducer.
 *
 * `idle` with no error and no prior revalidation result.
 */
export const initialDeletionState: DeletionIdleState = {
  kind: "idle",
  error: null,
  lastRevalidation: null,
};

/**
 * Exhaustiveness helper. Use at the end of a `switch (state.kind)`
 * so future additions to the union surface as a compile-time error.
 *
 * ```typescript
 * switch (state.kind) {
 *   case 'idle': return /* ... *\/;
 *   case 'pending': return /* ... *\/;
 *   case 'uncertain': return /* ... *\/;
 *   case 'cleanup': return /* ... *\/;
 *   case 'completed': return /* ... *\/;
 *   default: return assertNeverExhaustiveDeletionState(state);
 * }
 * ```
 */
export function assertNeverExhaustiveDeletionState(state: never): never {
  throw new Error(`Unhandled deletion state: ${JSON.stringify(state)}`);
}

/**
 * Type guards. Mirrors the `is*` helpers in
 * `session-error-mapper.ts` and `password-error-mapper.ts`. Useful
 * for inline conditional rendering in the modal component.
 */
export function isDeletionIdle(
  state: DeletionState,
): state is DeletionIdleState {
  return state.kind === "idle";
}

export function isDeletionPending(
  state: DeletionState,
): state is DeletionPendingState {
  return state.kind === "pending";
}

export function isDeletionUncertain(
  state: DeletionState,
): state is DeletionUncertainState {
  return state.kind === "uncertain";
}

export function isDeletionCleanup(
  state: DeletionState,
): state is DeletionCleanupState {
  return state.kind === "cleanup";
}

export function isDeletionCompleted(
  state: DeletionState,
): state is DeletionCompletedState {
  return state.kind === "completed";
}

/**
 * True when the hook refuses any further `submit()` because the
 * lifecycle is past the point of no return. Used by the hook itself
 * (`if (isTerminalDeletionState(state)) return;`) and by tests to
 * assert the deduplication contract.
 *
 * `cleanup` is terminal (the request landed); `completed` is the
 * post-cleanup terminal. `pending` is in flight but not yet terminal
 * — the hook drops concurrent submits but does not mark them as
 * permanently refused.
 */
export function isTerminalDeletionState(state: DeletionState): boolean {
  return state.kind === "cleanup" || state.kind === "completed";
}
