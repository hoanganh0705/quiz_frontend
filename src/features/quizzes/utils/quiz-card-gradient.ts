/**
 * Deterministic gradient palette for the missing-thumbnail fallback
 * on the quizzes directory.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.F4.
 *
 * When a `QuizListItemDto` carries `imageUrl: null | undefined`, the
 * directory card renders a deterministic gradient picked from this
 * palette based on the `quizId` hash. The same `quizId` always
 * produces the same gradient (no random fallback) so the UI is
 * stable across renders, refreshes, and SSR.
 *
 * The function is pure (no `Math.random`, no `Date.now`, no
 * module-level mutable state) and exported separately from the
 * React component so it is unit-testable in isolation.
 */

/**
 * Twelve pre-defined two-stop linear gradients. The palette covers
 * cool-to-warm hues and is readable against white initials at ~60%
 * luminance. The list order is the canonical "pair index" — the
 * helper picks an index deterministically from the `quizId` hash.
 */
export const QUIZ_CARD_GRADIENTS: readonly string[] = [
  'linear-gradient(135deg, hsl(210 80% 45%) 0%, hsl(265 70% 55%) 100%)',
  'linear-gradient(135deg, hsl(140 60% 40%) 0%, hsl(180 70% 45%) 100%)',
  'linear-gradient(135deg, hsl(340 75% 50%) 0%, hsl(15 85% 60%) 100%)',
  'linear-gradient(135deg, hsl(45 85% 50%) 0%, hsl(25 85% 55%) 100%)',
  'linear-gradient(135deg, hsl(195 75% 45%) 0%, hsl(225 70% 50%) 100%)',
  'linear-gradient(135deg, hsl(290 60% 50%) 0%, hsl(320 70% 55%) 100%)',
  'linear-gradient(135deg, hsl(80 70% 45%) 0%, hsl(140 60% 40%) 100%)',
  'linear-gradient(135deg, hsl(0 75% 50%) 0%, hsl(340 75% 55%) 100%)',
  'linear-gradient(135deg, hsl(255 65% 50%) 0%, hsl(285 70% 55%) 100%)',
  'linear-gradient(135deg, hsl(35 80% 50%) 0%, hsl(55 85% 55%) 100%)',
  'linear-gradient(135deg, hsl(165 65% 40%) 0%, hsl(195 75% 50%) 100%)',
  'linear-gradient(135deg, hsl(310 70% 50%) 0%, hsl(340 75% 55%) 100%)'
]

/**
 * Stable 32-bit hash of the input string. Mirrors the
 * `initialsFromQuizId` helper in `QuizzesDirectoryPage.tsx` so the
 * two helpers pick consistent indices for the same `quizId`.
 */
function hashQuizId(quizId: string): number {
  let hash = 0
  for (let i = 0; i < quizId.length; i += 1) {
    hash = (hash * 31 + quizId.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Pick a deterministic gradient string from `QUIZ_CARD_GRADIENTS`
 * for the given `quizId`. The result is stable across calls — the
 * same `quizId` always produces the same gradient.
 */
export function gradientFromQuizId(quizId: string): string {
  const idx = hashQuizId(quizId) % QUIZ_CARD_GRADIENTS.length
  return QUIZ_CARD_GRADIENTS[idx]!
}