/**
 * `QuizRelatedQuizzesEmpty.spec.ts` — locks the never-render
 * invariant on the `<QuizRelatedQuizzesEmpty />` stub.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.C2.
 *
 * Two cases per the ticket:
 *
 *   (a) Calling `QuizRelatedQuizzesEmpty()` throws an `Error` whose
 *       message includes the literal string `[QuizRelatedQuizzesEmpty]`
 *       AND a reference to `Story 3.8 line 880`. The throw is the
 *       grep-able signal a future contributor will see if they
 *       accidentally wire the empty state into the live component.
 *   (b) The symbol `QuizRelatedQuizzesEmpty` is NOT exported from
 *       `@/features/quizzes/components` (the feature barrel). The
 *       stub is private — a future contributor would have to reach
 *       into the file directly to trigger the throw.
 *
 * Test-environment note: vitest's `node` project picks up this file
 * via the `src/**` + `.spec.ts` include rule. No jsdom is needed —
 * the test only invokes a function and grep's the barrel.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { QuizRelatedQuizzesEmpty } from '@/features/quizzes/components/QuizRelatedQuizzesEmpty'

// ──────────────────────────────────────────────────────────────────────
// (a) Never-render invariant
// ──────────────────────────────────────────────────────────────────────

describe('QuizRelatedQuizzesEmpty — never-render invariant', () => {
  it('throws an Error when invoked', () => {
    expect(() => QuizRelatedQuizzesEmpty()).toThrowError(
      /\[QuizRelatedQuizzesEmpty\]/,
    )
  })

  it('the error message references `Story 3.8 line 880` so the failure mode is grep-able from logs', () => {
    let captured: unknown = null
    try {
      QuizRelatedQuizzesEmpty()
    } catch (err) {
      captured = err
    }
    expect(captured).toBeInstanceOf(Error)
    const message = (captured as Error).message
    expect(message).toContain('[QuizRelatedQuizzesEmpty]')
    expect(message).toContain('Story 3.8 line 880')
  })
})

// ──────────────────────────────────────────────────────────────────────
// (b) Barrel-not-exported invariant
// ──────────────────────────────────────────────────────────────────────

describe('QuizRelatedQuizzesEmpty — barrel-not-exported invariant', () => {
  it('is NOT re-exported from `src/features/quizzes/components/index.ts` (the feature barrel)', () => {
    // Read the barrel file directly from disk. We deliberately
    // do NOT import `@/features/quizzes/components` and check
    // the resolved keys — we want to assert the barrel source
    // does not contain the symbol, even as a commented-out line.
    const barrelPath = resolve(
      process.cwd(),
      'src/features/quizzes/components/index.ts',
    )
    const barrelSource = readFileSync(barrelPath, 'utf-8')
    expect(barrelSource).not.toMatch(/QuizRelatedQuizzesEmpty/)
  })

  it('is NOT re-exported from the top-level feature barrel `@/features/quizzes`', () => {
    const barrelPath = resolve(process.cwd(), 'src/features/quizzes/index.ts')
    const barrelSource = readFileSync(barrelPath, 'utf-8')
    // The top-level barrel re-exports the components barrel via
    // `export * from './components'`. A `grep` against the source
    // for the symbol catches a future contributor who tries to
    // surface the stub at the feature root.
    expect(barrelSource).not.toMatch(/QuizRelatedQuizzesEmpty/)
  })
})
