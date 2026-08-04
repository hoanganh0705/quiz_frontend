/**
 * `useCreateReview` — create-review mutation hook with explicit
 * gate-race outcomes.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.8.
 *
 * ## What this hook owns
 *
 * - POST a new review for a quiz through `createReview(quizId,
 *   payload)` (T-4.13.1).
 * - On success: revalidates every page of the quiz's review list
 *   (`useQuizReviews`) AND the my-review cache (`useMyQuizReview`)
 *   AND the completed-attempt eligibility cache so the gate hook
 *   (T-4.13.7) can re-resolve to `existing-review`. The cache
 *   invalidation goes through the shared `invalidateReviewCaches`
 *   helper (T-4.13.2) so all three keys stay in lockstep.
 * - On error: surfaces a typed `ApiError` AND a discriminated
 *   `outcome` that the form uses to swap UI states without
 *   parsing `ApiError.status` / `.code` itself.
 *
 * ## Outcome model (T-4.13.8 AC #4–#7)
 *
 * The `lastOutcome` discriminated union maps the backend's typed
 * `ApiError.code` values to user-facing states:
 *
 * - `success`                    — review persisted; form can close.
 * - `attempt-required`           — `403 REVIEW_ATTEMPT_REQUIRED`. The
 *                                  gate needs to flip to the
 *                                  "complete an attempt first"
 *                                  notice.
 * - `conflict`                   — `409 REVIEW_CONFLICT`. The viewer
 *                                  already has a review; the form
 *                                  should swap to the inline editor.
 *                                  The hook also revalidates my-review
 *                                  so the next gate read resolves to
 *                                  `existing-review`.
 * - `validation`                 — `422 REVIEW_VALIDATION`. The form
 *                                  should map `field` errors back to
 *                                  the `reviewFormSchema` fields.
 * - `reverted`                   — every other failure (429, 5xx,
 *                                  transport). The form retains its
 *                                  pre-submit state and surfaces an
 *                                  inline error notice.
 *
 * The `error` field carries the raw `ApiError` so the form can
 * still branch on `.code` for edge cases not enumerated above
 * (e.g. `error.extensions.field` mapping on `validation`).
 *
 * ## Why not `useOptimisticMutation`
 *
 * Reviews are composite entities: a successful create triggers a
 * list re-ordering AND a gate-state flip. We invalidate rather
 * than optimistically patch so the cache converges to the server's
 * authoritative ordering and timing. Mirrors `useCreateComment`'s
 * "invalidate, do not optimistically patch" policy (T-4.12.6).
 *
 * ## Single-flight
 *
 * A second `submit()` call while the first is in flight returns
 * the same in-flight promise — no duplicate posts. Mirrors
 * `useCreateComment`'s `inFlightRef` discipline.
 *
 * ## Auth
 *
 * The hook reads the session id from `useAuthBootstrap` so the
 * session-scoped cache keys (my-review, eligibility) are
 * invalidated with the right session marker. When the bootstrap
 * is unresolved, the hook falls back to a predicate-based
 * invalidation that targets every review key for the quiz.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import { createReview } from '@/features/reviews/services/reviews.service';
import {
  invalidateReviewCaches,
} from '@/features/reviews/types';

import type { CreateReviewDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Discriminated outcome of the most recent `submit()` call. The form
 * switches UI state on `lastOutcome.kind`; it falls back to the raw
 * `error` when the kind is `reverted` (or any new code we have not
 * yet enumerated).
 */
export type CreateReviewOutcomeKind =
  | 'success'
  | 'attempt-required'
  | 'conflict'
  | 'validation'
  | 'reverted';

export interface CreateReviewOutcome {
  kind: CreateReviewOutcomeKind;
  /** The raw `ApiError` for typed-kind branches; `null` for `success`. */
  cause: ApiError | null;
}

export interface UseCreateReviewOptions {
  /** Callback after a successful create. */
  onSuccess?: () => void;
  /** Callback for every failed create, including typed-kind failures. */
  onError?: (outcome: CreateReviewOutcome) => void;
}

export interface UseCreateReviewResult {
  /**
   * Submit the create-review request. Resolves to `true` on success,
   * `false` when dropped (single-flight guard) or rejected. Outcomes
   * surface via `lastOutcome` / `error`.
   */
  submit: (payload: CreateReviewDto) => Promise<boolean>;
  /** `true` while a create is in flight. */
  isLoading: boolean;
  /** The raw `ApiError` from the most recent failed submit. `null` until a failure. */
  error: ApiError | null;
  /** Classified outcome of the most recent submit. `null` until the first submit. */
  lastOutcome: CreateReviewOutcome | null;
  /** Clear `error` / `lastOutcome` and return to the idle state. */
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Construct a typed `ApiError` for synthetic code paths (missing
 * quizId, non-ApiError rejections). Mirrors the shape the existing
 * review specs use to construct `ApiError` from a fake AxiosError
 * envelope — the `fromAxios` factory would otherwise reject our
 * synthetic payload as malformed.
 */
function makeSyntheticApiError(
  status: number,
  code: string,
  message: string,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/synthetic',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-synthetic' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

/**
 * Invalidate every review cache key (any session) for one quiz.
 * Used as a fallback when the session id is not yet known (auth
 * bootstrap unresolved). Mirrors the predicate the shared helper
 * uses but without targeting specific session-scoped keys.
 */
async function invalidateAllReviewKeysForQuiz(
  mutate: typeof globalMutate,
  quizId: string,
): Promise<void> {
  await mutate(
    (key: readonly unknown[]) =>
      Array.isArray(key) && key[0] === 'reviews' && key[2] === quizId,
    undefined,
    { revalidate: true },
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Create-review mutation hook with gate-race outcome classification.
 *
 * @example
 * ```tsx
 * const { submit, isLoading, lastOutcome, error } = useCreateReview(quizId, {
 *   onSuccess: () => onClose(),
 * });
 *
 * <button
 *   disabled={isLoading}
 *   onClick={() => submit({ rating, comment })}
 * >
 *   {isLoading ? 'Submitting…' : 'Post review'}
 * </button>
 *
 * {lastOutcome?.kind === 'attempt-required' && <AttemptRequiredNotice />}
 * {lastOutcome?.kind === 'conflict' && <ConflictNotice />}
 * {lastOutcome?.kind === 'validation' && (
 *   <ValidationNotice apiError={error} />
 * )}
 * {lastOutcome?.kind === 'reverted' && <RetryNotice apiError={error} />}
 * ```
 */
export function useCreateReview(
  quizId: string,
  options: UseCreateReviewOptions = {},
): UseCreateReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] =
    useState<CreateReviewOutcome | null>(null);

  // Single-flight coalescing ref. Mirrors `useCreateComment` (T-4.12.6).
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  // The current session id, derived from the auth bootstrap. Used
  // as the cache key suffix for my-review + eligibility so the
  // shared helper invalidates the right session.
  const { currentUser } = useAuthBootstrap();
  const sessionId = useMemo<string | null>(() => {
    const u = currentUser as { id?: string; userId?: string } | null;
    if (!u) return null;
    return u.id ?? u.userId ?? null;
  }, [currentUser]);

  const handleSubmit = useCallback(
    async (payload: CreateReviewDto): Promise<boolean> => {
      if (!quizId) {
        // Defensive — the form should never render without a quiz id,
        // but if a caller forgets, fail loudly as a validation outcome
        // rather than throw.
        const synthetic = makeSyntheticApiError(
          0,
          'REVIEW_VALIDATION',
          'quizId is required to submit a review',
        );
        setError(synthetic);
        setLastOutcome({ kind: 'validation', cause: synthetic });
        onError?.({ kind: 'validation', cause: synthetic });
        return false;
      }

      // Guard: single-flight coalescing.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      setLastOutcome(null);

      const core = (async (): Promise<boolean> => {
        try {
          await createReview(quizId, payload);

          // Revalidate every page of the quiz's review list AND
          // the my-review AND eligibility caches. The shared helper
          // (T-4.13.2) targets the list with a predicate and the
          // session-scoped my-review + eligibility keys explicitly.
          if (sessionId) {
            await invalidateReviewCaches(globalMutate as never, {
              quizId,
              sessionId,
            });
          } else {
            // Bootstrap still resolving — invalidate every review
            // key for this quiz regardless of session marker.
            await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
          }

          setLastOutcome({ kind: 'success', cause: null });
          onSuccess?.();
          return true;
        } catch (cause: unknown) {
          if (!isApiError(cause)) {
            // Unknown rejection shape — surface as generic reverted.
            const synthetic = makeSyntheticApiError(
              0,
              'GLOBAL_UNKNOWN',
              String(cause),
            );
            setError(synthetic);
            const outcome: CreateReviewOutcome = {
              kind: 'reverted',
              cause: synthetic,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }

          // Classified typed errors per T-4.13.8 AC #4–#6.
          switch (cause.code) {
            case 'REVIEW_ATTEMPT_REQUIRED': {
              // 403. The gate needs to re-resolve to
              // `attempt-required`; revalidate the eligibility +
              // my-review keys so the next gate read is fresh.
              if (sessionId) {
                await invalidateReviewCaches(globalMutate as never, {
                  quizId,
                  sessionId,
                });
              } else {
                await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
              }
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: 'attempt-required',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case 'REVIEW_CONFLICT': {
              // 409. The viewer already has a review; the form must
              // swap to the inline editor. The hook revalidates the
              // my-review + eligibility keys so the gate (T-4.13.7)
              // flips to `existing-review` on the next render.
              if (sessionId) {
                await invalidateReviewCaches(globalMutate as never, {
                  quizId,
                  sessionId,
                });
              } else {
                await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
              }
              setError(cause);
              const outcome: CreateReviewOutcome = { kind: 'conflict', cause };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case 'REVIEW_VALIDATION': {
              // 422. The form maps field-level errors back to
              // `reviewFormSchema` fields.
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: 'validation',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            default: {
              // Every other failure (429, 5xx, transport) is a
              // generic reverted state — the form retains its
              // pre-submit payload and surfaces a retry notice.
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: 'reverted',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
          }
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    },
    [quizId, sessionId, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
  }, []);

  return {
    submit: handleSubmit,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}
