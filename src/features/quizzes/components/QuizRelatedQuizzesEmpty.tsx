/**
 * `<QuizRelatedQuizzesEmpty />` — INTENTIONALLY-UNRENDERED stub.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.C1.
 *
 * ## Why this file exists at all
 *
 * The planning doc (`PHASE_3_EPICS.md` Story 3.8 line 866) lists this
 * file alongside `<QuizRelatedQuizzes />` and
 * `<QuizRelatedQuizzesSkeleton />` for parity with `<QuizRailEmpty />`
 * from Story 3.7. But the semantic is the **opposite** of an empty
 * state:
 *
 *   > Story 3.8 line 880, verbatim:
 *   > "Hidden — if related quizzes is empty, the block is not
 *   >  rendered at all (not an 'empty state' the user perceives as
 *   >  failure)."
 *
 * That is, the empty case IS the absence of the block. The user's
 * perception of "this quiz has no related quizzes" is the
 * impression of a failure mode, so the live component (B2) returns
 * `null` when the related engine returns zero items (or hits the
 * 404 / 5xx silent-failure contract from lines 884–885).
 *
 * ## Why this function throws
 *
 * This stub exists to make sure that, if a future contributor
 * accidentally wires the empty state into the live component (or
 * reaches for `<QuizRelatedQuizzesEmpty />` to "fix" what looks like
 * a missing case), the error surfaces in tests / at runtime
 * rather than silently rendering an empty-state panel that would
 * violate the contract from line 880.
 *
 * ## Why this is NOT exported from the feature barrel
 *
 * Leaving this symbol out of `src/features/quizzes/components/index.ts`
 * means it cannot be imported by accident — a contributor would
 * have to reach into the file directly to trigger the throw,
 * which is itself a useful guardrail.
 */

/**
 * Throws an `Error` if ever invoked. The message contains the
 * literal string `[QuizRelatedQuizzesEmpty]` and a reference to
 * Story 3.8 line 880 so the failure mode is grep-able from any
 * error log.
 *
 * The function takes no arguments — keeping the signature empty
 * (instead of accepting a `props` object that is then unused)
 * avoids the project's `@typescript-eslint/no-unused-vars` lint
 * rule that does not honour the `_props` underscore convention.
 */
export function QuizRelatedQuizzesEmpty(): never {
  throw new Error(
    '[QuizRelatedQuizzesEmpty] This component must never render — the ' +
      'related block is hidden on empty per Story 3.8 line 880. If you ' +
      'see this error, a future contributor has wired the empty state ' +
      'into the live component. Revert that wiring and let <QuizRelatedQuizzes /> ' +
      'return `null` on the empty / 404 / 5xx paths.',
  );
}

export default QuizRelatedQuizzesEmpty;
