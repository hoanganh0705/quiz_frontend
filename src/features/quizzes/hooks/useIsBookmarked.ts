/**
 * `useIsBookmarked` — Story 3.10-compatible reader placeholder.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B4.
 *
 * Story 3.6 needs a stable seam for the bookmark-membership read
 * consumed by the CTA but does NOT implement bookmark state or
 * persistence. This placeholder hook returns `false` for every
 * value, performs no network request, never mutates a store,
 * never persists, and never redirects.
 *
 * The exported name and signature must remain stable so Story 3.10
 * can replace the implementation internally without changing
 * `QuizCtaStrip` props (B4 AC #3).
 *
 * The hook deliberately does NOT import the existing legacy
 * `BookmarkButton` (which performs mutations) because that would
 * violate Story 3.6's no-op scope.
 */

'use client';

export interface UseIsBookmarkedResult {
  /**
   * Whether the current user has bookmarked the given quiz.
   * Story 3.6 always returns `false`.
   */
  isBookmarked: boolean;
  /**
   * `true` while Story 3.10 is wiring the real read. Story 3.6
   * always returns `false` (the placeholder is synchronous).
   */
  isLoading: boolean;
}

/**
 * Placeholder reader hook. Returns `{ isBookmarked: false,
 * isLoading: false }` for every input.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useIsBookmarked(_quizId: string): UseIsBookmarkedResult {
  return {
    isBookmarked: false,
    isLoading: false,
  };
}
