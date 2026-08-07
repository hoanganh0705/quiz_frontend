/**
 * `error-coercion.ts` — single canonical entry point for turning an
 * arbitrary `unknown` thrown value into a typed `ApiError`.
 *
 * Source epic: Phase 3 — `ApiError` constructor + `coerceToApiError`.
 * Source ticket: TKT-Phase-3.E1.
 *
 * ## Why this module exists
 *
 * Before Phase 3, every feature re-implemented its own
 * `wrapAsApiError(err: unknown): ApiError` helper. The pattern
 * repeated across `useQuizByIdOrSlug.ts`, `useQuizStatsByIdOrSlug.ts`,
 * `useRelationship.ts`, `useRecalculateRanking.ts`,
 * `useResetRankingPeriod.ts`, `useCheckUsername.ts`, `useFollow.ts`,
 * `useUserSearch.ts`, `useDeleteAccount.ts`, `feed.service.ts`, and
 * the tournament-admin `mutation-helpers.ts`. Each implementation
 * had subtle differences:
 *
 *   - Some passed through `ApiError` instances, some re-wrapped them.
 *   - Some constructed a synthetic `GLOBAL_INTERNAL_ERROR` envelope
 *     for `string` / `Error` / `null` inputs, some returned
 *     `new Error(String(caught))` cast as `ApiError`.
 *   - The synthetic envelope used different `requestId` values
 *     (`'client-unknown'`, `'synthetic-...'`, etc.) making
 *     cross-feature error correlation unreliable.
 *
 * The helpers were also tagged as `@internal` and `@deprecated` by
 * individual feature audits, but never consolidated. The result:
 * `useOptimisticMutation` and the SWR error path sometimes saw a
 * real `ApiError`, sometimes a synthetic one, sometimes an unknown
 * `Error` — a partial guarantee of type safety.
 *
 * ## What this module guarantees
 *
 *   1. **All inputs produce an `ApiError`.** No `Error | unknown` union
 *      leaks past this boundary.
 *   2. **`ApiError` instances pass through unchanged.** No new
 *      `new ApiError(existing)` wrapping.
 *   3. **Axios-shaped errors are decoded via `ApiError.fromAxios`.**
 *      Existing RFC 7807 fixture tests still pass.
 *   4. **Anything else becomes a canonical synthetic envelope**
 *      with `code: 'GLOBAL_INTERNAL_ERROR'`, `status: 0`,
 *      `requestId: 'client-unknown'`, and the original `String(caught)`
 *      in `detail`. The shape is identical for every call site, so
 *      `apiError.code === 'GLOBAL_INTERNAL_ERROR'` is a total check.
 *   5. **Synthetic envelopes carry the same wire-shape the backend
 *      emits** (`{ status, detail, title, extensions: { code, requestId } }`).
 *      The `ApiError` getters (`code`, `detail`, `requestId`, `status`,
 *      `isServerError`) all return the right values for both real
 *      and synthetic errors.
 *
 * ## Why a static `ApiError.fromInput` factory?
 *
 * The audit also widens the `ApiError` constructor to accept a
 * structural `{ code, status, message, ...rfc7807 }` directly. The
 * factory is the public entry point; the constructor still accepts
 * the legacy `AxiosError<unknown>` shape for backward compatibility
 * with `custom-instance.ts` interceptors. `coerceToApiError` is the
 * recommended path for application code; `new ApiError(axiosError)`
 * remains for the interceptor.
 *
 * @see src/lib/api/core/ApiError.ts
 * @see src/lib/api/error-types.ts
 * @see docs/frontend-cleanup-audit.md Phase 3
 */

import { ApiError } from '@/lib/api/core/ApiError';
import type { ApiErrorInput } from '@/lib/api/error-types';

export type { ApiErrorInput } from '@/lib/api/error-types';

// ─── Coercion ────────────────────────────────────────────────────────────

/**
 * Detect whether a value looks like an `AxiosError` enough to be
 * safely passed to `ApiError.fromAxios`. Defensive: callers may
 * throw a half-formed object (e.g. `throw { status: 500 }` in
 * pre-existing tests), and we don't want to crash inside the
 * coercion helper.
 */
function isAxiosErrorLike(value: unknown): value is Parameters<
  typeof ApiError.fromAxios
>[0] {
  if (typeof value !== 'object' || value === null) return false;
  // `isAxiosError: true` is the canonical discriminator.
  if ('isAxiosError' in value && (value as { isAxiosError?: unknown }).isAxiosError === true) {
    return true;
  }
  // `response: { data, status }` is the structural shape every axios
  // error carries. Accept it as a fallback for ad-hoc test fixtures.
  const response = (value as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) return false;
  const r = response as { data?: unknown; status?: unknown };
  return 'data' in r || 'status' in r;
}

/**
 * Coerce an arbitrary `unknown` thrown value into a typed
 * `ApiError`. The single canonical entry point for error
 * normalization across the application.
 *
 * Behaviour (in order):
 *
 *   1. If `caught` is already an `ApiError`, return it unchanged.
 *   2. If `caught` looks like an `AxiosError` (`isAxiosError: true`
 *      or has a `response: { data, status }` shape), decode it via
 *      `ApiError.fromAxios` so all RFC 7807 fields populate.
 *   3. If `caught` is a structural `ApiErrorInput` (`{ code, status, message }`),
 *      wrap it via `ApiError.fromInput` so callers can throw synthetic
 *      envelopes without `as unknown as AxiosError` casts.
 *   4. Otherwise, build a synthetic `GLOBAL_INTERNAL_ERROR` envelope
 *      whose `detail` is `String(caught)`.
 *
 * The function never throws and never returns `null` / `undefined`.
 *
 * @example
 *   try {
 *     await apiCall();
 *   } catch (err) {
 *     const apiErr = coerceToApiError(err);
 *     if (apiErr.code === 'QUIZ_NOT_FOUND') { ... }
 *   }
 */
export function coerceToApiError(caught: unknown): ApiError {
  // Fast-path: pass-through for already-typed errors.
  if (caught instanceof ApiError) {
    return caught;
  }

  // Axios-shaped: real network errors + legacy axios test fixtures.
  if (isAxiosErrorLike(caught)) {
    return ApiError.fromAxios(caught);
  }

  // Structural: callers throwing a plain `{ code, status, message }`
  // object. We treat any `code: string` or `status: number` field as
  // a signal that the caller intended a typed error.
  if (looksLikeApiErrorInput(caught)) {
    return ApiError.fromInput(caught);
  }

  // Fallback: synthetic GLOBAL_INTERNAL_ERROR envelope.
  return ApiError.fromInput({
    status: 0,
    code: 'GLOBAL_INTERNAL_ERROR',
    title: 'UnknownError',
    message: String(caught),
    requestId: 'client-unknown',
  });
}

/**
 * Heuristic for "this object was meant to be an `ApiError`". We
 * accept it when the caller provided at least one of the canonical
 * error fields (`code`, `status`, `message`) and the object is
 * non-null.
 */
function looksLikeApiErrorInput(value: unknown): value is ApiErrorInput {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === 'string' ||
    typeof v.status === 'number' ||
    typeof v.message === 'string'
  );
}
