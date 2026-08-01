/**
 * `gradientFromQuizId` — pure helper unit spec.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.F4.
 *
 * Locks the deterministic-pick contract (Story 3.5 line 588):
 *
 *   - The same `quizId` always produces the same gradient.
 *   - The result is always one of the 12 entries in
 *     `QUIZ_CARD_GRADIENTS`.
 *   - Two distinct `quizId`s MAY map to the same gradient (the
 *     palette is finite by design — that's the point).
 */

import { describe, expect, it } from 'vitest'

import {
  QUIZ_CARD_GRADIENTS,
  gradientFromQuizId
} from '@/features/quizzes/utils/quiz-card-gradient'

describe('gradientFromQuizId', () => {
  it('returns one of the palette entries', () => {
    const fixture = [
      '0192f4d8-0000-7000-8000-000000000001',
      '0192f4d8-0000-7000-8000-000000000002',
      '0192f4d8-0000-7000-8000-000000000003',
      'some-non-uuid-slug',
      ''
    ]
    for (const quizId of fixture) {
      const result = gradientFromQuizId(quizId)
      expect(QUIZ_CARD_GRADIENTS).toContain(result)
    }
  })

  it('is deterministic — the same quizId always picks the same gradient', () => {
    const quizId = '0192f4d8-0000-7000-8000-000000000123'
    const first = gradientFromQuizId(quizId)
    const second = gradientFromQuizId(quizId)
    const third = gradientFromQuizId(quizId)
    expect(first).toBe(second)
    expect(second).toBe(third)
  })

  it('two different quizIds CAN map to the same gradient (finite palette by design)', () => {
    // The palette has 12 entries; pick two random ids and just verify
    // the helper does not throw. The mapping is a hash mod N — the
    // exact pair is not pinned by the test.
    const a = gradientFromQuizId('id-a')
    const b = gradientFromQuizId('id-b')
    expect(QUIZ_CARD_GRADIENTS).toContain(a)
    expect(QUIZ_CARD_GRADIENTS).toContain(b)
  })
})