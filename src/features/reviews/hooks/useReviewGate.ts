/**
 * `useReviewGate` — deterministic gate resolution hook.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.7.
 *
 * ## What this hook owns
 *
 * Combines authentication (`useAuthBootstrap`), the my-review lookup
 * (`useMyQuizReview`, T-4.13.5) and the completed-attempt eligibility
 * read (`useCompletedQuizAttempt`, T-4.13.6) into ONE deterministic
 * `ReviewGateState` discriminated union. The gated authoring form
 * (T-4.13.15) and the widget (T-4.13.19) consume this state — they
 * never reach into the underlying inputs directly.
 *
 * ## Cheaper-path ordering
 *
 * The hook resolves the gate strictly in the cheaper order:
 *
 *   1. Auth bootstrap — private reviews/attempt queries do not fire
 *      while the viewer is unauthenticated or the bootstrap is
 *      unresolved.
 *   2. My-review — a 200 result short-circuits to `existing-review`
 *      without firing the completed-attempt query.
 *   3. Eligibility — only when no review exists does the hook run
 *      `useCompletedQuizAttempt` to decide between `eligible` and
 *      `attempt-required`.
 *
 * This ordering matches the AC for the ticket and preserves the
 * approved cheaper-path behaviour (my-review first, attempt lookup
 * skipped when unnecessary).
 *
 * ## Error handling
 *
 * - A my-review 5xx / 401 / 429 surfaces as `state.kind === 'error'`,
 *   NOT `attempt-required`.
 * - An eligibility 5xx / 401 / 429 surfaces as `state.kind === 'error'`,
 *   NOT `attempt-required`.
 * - The two error sources are merged into one — the consumer renders
 *   a single banner with a Retry target that revalidates both
 *   underlying queries.
 *
 * ## Targeted revalidation
 *
 * `revalidate()` invalidates BOTH the my-review key and the
 * eligibility key. The list cache is NOT touched — list revalidation
 * is `ReviewsWidget`'s responsibility after a successful mutation.
 *
 * ## Return shape
 *
 *   `{ state, isLoading, revalidate }`.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { mutate as globalMutate } from 'swr';

import {
  myQuizReviewKey,
  reviewQuizAttemptKey,
  type ReviewGateState,
  type ReviewGateResult,
} from '@/features/reviews/types';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';

import { useMyQuizReview } from './useMyQuizReview';
import { useCompletedQuizAttempt } from './useCompletedQuizAttempt';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseReviewGateParams {
  /** Quiz ID to evaluate the gate for. Pass `null` to disable. */
  quizId: string | null;
}

// ─── Helpers (module-private) ────────────────────────────────────────────────

/**
 * Reduce the three gate inputs into one `ReviewGateState` branch.
 * Lives outside the hook so the reducer's logic is pure and
 * unit-testable without React rendering.
 */
function resolveGateState(
  bootstrapState: 'idle' | 'bootstrapping' | 'authenticated' | 'unauthenticated' | 'error',
  my: {
    review: unknown;
    hasResolved: boolean;
    isLoading: boolean;
    error: unknown;
  },
  attempt: {
    hasCompletedAttempt: boolean;
    hasResolved: boolean;
    error: unknown;
  },
): ReviewGateState {
  // 1. Auth bootstrap hasn't resolved — render the loading shell.
  if (
    bootstrapState === 'idle' ||
    bootstrapState === 'bootstrapping'
  ) {
    return { kind: 'loading' };
  }

  // 2. Viewer is unauthenticated — private queries were never fired
  //    and must not appear to have run.
  if (bootstrapState === 'unauthenticated') {
    return { kind: 'unauthenticated' };
  }

  // bootstrapState === 'authenticated' from here. Resolve the
  // my-review / attempt branches.

  // My-review is in flight → loading. Avoids flashing the create
  // form (or the gate) before the cheaper-of-the-two inputs has
  // settled.
  if (my.isLoading) {
    return { kind: 'loading' };
  }

  // My-review query error → surface as `error`, never as
  // `attempt-required`. A 401/403/429/5xx has different recovery
  // than "no completed attempt".
  if (my.error) {
    return { kind: 'error', error: my.error };
  }

  // My-review has resolved with a non-null review → existing-review.
  if (my.hasResolved && my.review !== null) {
    // The reducer signature accepts `unknown` for `my.review` to
    // stay decoupled from the hook return type; narrow here.
    return {
      kind: 'existing-review',
      review: my.review as Extract<ReviewGateState, { kind: 'existing-review' }>['review'],
    };
  }

  // My-review has resolved with `null` (404 normalised). The
  // completion-attempt check decides between `eligible` and
  // `attempt-required`.

  // Attempt query error → same error branch as above.
  if (attempt.error) {
    return { kind: 'error', error: attempt.error };
  }

  // No my-review + no completed attempt → attempt-required.
  if (attempt.hasResolved && attempt.hasCompletedAttempt === false) {
    return { kind: 'attempt-required' };
  }

  // No my-review + completed attempt exists → eligible.
  if (attempt.hasResolved && attempt.hasCompletedAttempt === true) {
    return { kind: 'eligible' };
  }

  // Anything still in flight → loading. We treat "hasResolved false"
  // on either side as loading; the widget renders the skeleton.
  return { kind: 'loading' };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Resolve the Story 4.13 review gate for one quiz.
 *
 * @example
 *   const { state, isLoading, revalidate } = useReviewGate({
 *     quizId: 'uuid',
 *   });
 *
 *   switch (state.kind) {
 *     case 'loading':          return <Spinner />;
 *     case 'unauthenticated':  return <SignInPrompt />;
 *     case 'existing-review':  return <ReviewEditInline review={state.review} />;
 *     case 'eligible':         return <CreateForm />;
 *     case 'attempt-required': return <ReviewGateState />;
 *     case 'error':            return <ErrorBanner error={state.error} />;
 *   }
 */
export function useReviewGate(
  params: UseReviewGateParams,
): ReviewGateResult {
  const { quizId } = params;

  const { bootstrapState, currentUser } = useAuthBootstrap();

  // Stable session id derived from the bootstrap's currentUser.
  // `null` until bootstrap completes — the underlying hooks
  // disable themselves on a null session.
  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const my = useMyQuizReview({ quizId });
  const attempt = useCompletedQuizAttempt({ quizId });

  const state = useMemo<ReviewGateState>(
    () =>
      resolveGateState(
        bootstrapState,
        {
          review: my.review,
          hasResolved: my.hasResolved,
          isLoading: my.isLoading,
          error: my.error,
        },
        {
          hasCompletedAttempt: attempt.hasCompletedAttempt,
          hasResolved:
            !attempt.isLoading &&
            attempt.error === null,
          error: attempt.error,
        },
      ),
    [
      bootstrapState,
      my.review,
      my.hasResolved,
      my.isLoading,
      my.error,
      attempt.hasCompletedAttempt,
      attempt.isLoading,
      attempt.error,
    ],
  );

  const isLoading = state.kind === 'loading';

  // Targeted revalidation. Invalidates the my-review and eligibility
  // keys for the current session so the next render re-evaluates.
  // Does NOT touch the public list cache — the widget owns list
  // invalidation.
  const revalidate = useCallback(async (): Promise<void> => {
    if (quizId === null || sessionId === null) return;
    await Promise.all([
      globalMutate(myQuizReviewKey(quizId, sessionId), undefined, {
        revalidate: true,
      }),
      globalMutate(reviewQuizAttemptKey(quizId, sessionId), undefined, {
        revalidate: true,
      }),
    ]);
  }, [quizId, sessionId]);

  return { state, isLoading, revalidate };
}
