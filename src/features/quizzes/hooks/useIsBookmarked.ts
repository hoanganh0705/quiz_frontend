/**
 * `useIsBookmarked` — Story 3.10 reader over the membership cache.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B4.
 *
 * Replaces the Story 3.6 placeholder (`{ isBookmarked: false,
 * isLoading: false }` for every quizId) with a live boolean selector
 * over the deduplicated membership `Set<string>` exposed by
 * `useBookmarkedQuizIds` (TKT-3.10.B3).
 *
 * ## Stable signature (AC #1)
 *
 * The exported function name and the `{ isBookmarked, isLoading }`
 * result shape are unchanged from Story 3.6. The
 * `<QuizCtaStrip quizId={…} />` consumer
 * (`src/features/quizzes/components/QuizCtaStrip.tsx`) compiles
 * unchanged — it has been wired to this hook since Epic 3.6.
 *
 * ## Auth + hydration states (AC #3, #4)
 *
 *   - Unauthenticated → `{ isBookmarked: false, isLoading: false }`.
 *     The membership SWR key resolves to `null` so SWR skips the
 *     fetch (B3 AC #1); `useBookmarkedQuizIds` reports
 *     `isLoading: false` for the unauthenticated branch.
 *   - Initial authenticated hydration →
 *     `{ isBookmarked: false, isLoading: true }` until the
 *     fan-out fetches resolve. This is the documented "neutral
 *     unknown" state — `<QuizCtaStrip>` reads `isLoading` to
 *     render the loading button text.
 *   - Hydrated → `{ isBookmarked: quizIds.has(quizId), isLoading: false }`.
 *   - Cache mutation → SWR rerenders all consumers for the same
 *     `quizId` because the underlying `Set` is REPLACED (B3 AC #6)
 *     rather than mutated.
 *
 * ## No direct SDK access (AC #2)
 *
 * This hook reads from `useBookmarkedQuizIds` and never touches the
 * bookmark SDK, the wrapper, the auth cookie, or any storage. The
 * `QuizCtaStrip` slot is a pure reader.
 *
 * @see useBookmarkedQuizIds (B3 — the membership cache)
 * @see useBookmarkQuiz / useUnbookmarkQuiz (C1 / C2 — the writers)
 * @see QuizCtaStrip (Epic 3.6 consumer; unchanged)
 */

'use client';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useBookmarkedQuizIds } from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';

export interface UseIsBookmarkedResult {
  /**
   * Whether the current user has bookmarked the given quiz.
   *
   * `false` when the user is unauthenticated, while the membership
   * is hydrating, or when the quiz is not in the membership Set.
   */
  isBookmarked: boolean;
  /**
   * `true` while the membership SWR cache is hydrating for an
   * authenticated user. `<QuizCtaStrip>` renders the loading button
   * text when this is `true`.
   */
  isLoading: boolean;
}

export function useIsBookmarked(quizId: string): UseIsBookmarkedResult {
  const { isAuthenticated } = useAuthState();
  const { quizIds, isLoading } = useBookmarkedQuizIds();

  // AC #3 — unauthenticated branch is `{ false, false }`. The
  // membership SWR key is `null` for unauthenticated so `isLoading`
  // is already `false` from B3, but we short-circuit explicitly so
  // the unauthenticated contract is obvious to readers.
  if (!isAuthenticated) {
    return { isBookmarked: false, isLoading: false };
  }

  // AC #2 — only consult the membership Set after hydration so the
  // initial authenticated render reports the neutral "unknown"
  // state instead of a false-positive absence.
  if (isLoading) {
    return { isBookmarked: false, isLoading: true };
  }

  // AC #1 — `quizIds.has(quizId)` is O(1). The membership Set is
  // replaced on every SWR update (B3 AC #6), so a cache mutation
  // rerenders every consumer for the same `quizId` automatically.
  return {
    isBookmarked: quizIds.has(quizId),
    isLoading: false,
  };
}
