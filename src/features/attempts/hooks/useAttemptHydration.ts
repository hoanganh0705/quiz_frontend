'use client';

/**
 * `useAttemptHydration` — canonical active-attempt hydration hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.6.
 *
 * ## What this hook owns
 *
 * - Rebuilds the runner's server snapshot from an attempt ID after
 *   route entry, reload, or cross-tab reconciliation.
 * - Issues two reads:
 *     - `getAttempt(attemptId)` for the canonical attempt detail
 *       (`AttemptResponseDto` with embedded `answers: AttemptAnswerResponseDto[]`).
 *     - `getAttemptAnswers(attemptId)` for the standalone submitted-
 *       answers list (`AttemptAnswersResponseDto`).
 *   The two reads are run sequentially because the answers read is
 *   the canonical hydration source for the runner's lock set; the
 *   detail read carries status / metadata.
 * - Wraps each read in `useSingleWithRetry` so the 250 / 500 / 1000
 *   ms 429 backoff and manual `retry()` are reused.
 * - Gated on `useAuthBootstrap` so the private reads never fire while
 *   the bootstrap is unresolved or the viewer is unauthenticated.
 *
 * ## What this hook does NOT own
 *
 * - It does NOT call attempt analytics or attempt review. The
 *   post-attempt review surface (Story 4.15) owns those reads.
 * - It does NOT call attempt history. The active-attempt hook
 *   (T-4.14.5) owns the `started`-filter read.
 *
 * ## Hydration projection
 *
 * `submittedAnswers` is a `Record<questionId, AttemptAnswerItemDto>`
 * map derived from the canonical answers list. The runner's lock
 * set consults this map to decide whether the picker should accept a
 * new selection for a given question. The map omits any correctness
 * metadata; the player-DTO invariant is preserved.
 *
 * ## Return shape
 *
 *   `{ detail, submittedAnswers, isLoading, hasResolved, error, refresh }`.
 *   - `detail`: the canonical attempt-detail projection, or `null`
 *     when the first read has not yet resolved.
 *   - `submittedAnswers`: the question-id-keyed lock map. Always a
 *     fresh reference; consumers must read it as a snapshot.
 *   - `isLoading`: true only while a fetch is in flight.
 *   - `hasResolved`: true once the first fetch settles (success,
 *     404, or error) so the runner does not flash open before the
 *     first paint.
 *   - `error`: typed `ApiError` for non-404 failures, `null`
 *     otherwise.
 *   - `refresh`: manual revalidation across both the detail and the
 *     answers cache.
 */

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import {
  getAttempt,
  getAttemptAnswers,
} from '@/features/attempts/services/attempts.service';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import {
  ATTEMPT_CACHE_KEYS,
  type SubmittedAnswersMap,
} from '@/features/attempts/types/attempt-runner.types';

import type {
  AttemptAnswerItemDto,
  AttemptResponseDto,
} from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseAttemptHydrationParams {
  /**
   * Attempt identifier to hydrate. Pass `null` to disable the fetch
   * (e.g. before the runner has started).
   */
  attemptId: string | null;
}

export interface AttemptHydrationView {
  detail: AttemptResponseDto | null;
  submittedAnswers: SubmittedAnswersMap;
  isLoading: boolean;
  hasResolved: boolean;
  error: import('@/lib/api').ApiError | null;
  refresh: () => Promise<void>;
}

// ─── Hydration helpers ───────────────────────────────────────────────────────

/**
 * Reduce a canonical `AttemptAnswersResponseDto.answers` list to a
 * `Record<questionId, AttemptAnswerItemDto>` lock map.
 *
 * Duplicate `questionId` values collapse to the latest submission —
 * the backend orders items by submission timestamp so the runner
 * treats the trailing item as authoritative.
 */
export function buildSubmittedAnswersMap(
  items: readonly AttemptAnswerItemDto[] | undefined,
): SubmittedAnswersMap {
  if (!items || items.length === 0) return {};
  const out: Record<string, AttemptAnswerItemDto> = {};
  for (const item of items) {
    out[item.questionId] = item;
  }
  return out;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Canonical active-attempt hydration hook.
 *
 * @example
 *   const { detail, submittedAnswers, isLoading, refresh } =
 *     useAttemptHydration({ attemptId: attemptIdFromRoute });
 */
export function useAttemptHydration(
  params: UseAttemptHydrationParams,
): AttemptHydrationView {
  const { attemptId } = params;

  const { bootstrapState, currentUser } = useAuthBootstrap();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // The hydration read targets the attempt detail. The answers read
  // is driven by the detail key so a single key change invalidates
  // both. We use two `useSingleWithRetry` primitives — one per cache
  // key — and let the consumers `mutate` them independently when the
  // cross-tab reconciliation adapter (T-4.14.8) revalidates.
  const detailKey = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const answersKey = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const detailFetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<AttemptResponseDto | null> => {
        if (attemptId === null) return null;
        const wire = (await getAttempt(attemptId)) as unknown as {
          data?: AttemptResponseDto;
        } | null;
        if (signal.aborted) return wire?.data ?? null;
        return wire?.data ?? null;
      },
    [attemptId],
  );

  const answersFetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<SubmittedAnswersMap> => {
        if (attemptId === null) return {};
        const wire = (await getAttemptAnswers(attemptId)) as unknown as {
          data?: { answers?: AttemptAnswerItemDto[] };
        } | null;
        if (signal.aborted) {
          return buildSubmittedAnswersMap(wire?.data?.answers);
        }
        return buildSubmittedAnswersMap(wire?.data?.answers);
      },
    [attemptId],
  );

  const detail = useSingleWithRetry<AttemptResponseDto | null>({
    key: detailKey,
    fetcher: detailFetcher,
  });

  const answers = useSingleWithRetry<SubmittedAnswersMap>({
    key: answersKey,
    fetcher: answersFetcher,
  });

  // The hook is considered loading while either primitive is in
  // flight; the runner consults this for its skeleton.
  const isLoading = detail.isLoading || answers.isLoading;

  // `hasResolved` flips on once either primitive has settled. The
  // runner uses this to gate the question picker so the first paint
  // does not flash open before the lock set is known.
  const hasResolved =
    !isLoading && (detail.data !== undefined || detail.error !== null || answers.data !== undefined || answers.error !== null);

  // The error field collapses both primitives' errors. The detail
  // read wins because its failure indicates the attempt itself is
  // not reachable; the answers read is only a follow-up.
  const error: ApiError | null = detail.error ?? answers.error;

  const refresh = useCallback(async () => {
    await Promise.all([detail.retry(), answers.retry()]);
  }, [detail.retry, answers.retry]);

  return {
    detail: detail.data ?? null,
    submittedAnswers: answers.data ?? {},
    isLoading,
    hasResolved,
    error,
    refresh,
  };
}

export { buildSubmittedAnswersMap as buildHydrationLockMap };