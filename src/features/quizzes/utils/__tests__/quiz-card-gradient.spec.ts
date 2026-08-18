

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

const a = gradientFromQuizId('id-a')
const b = gradientFromQuizId('id-b')
expect(QUIZ_CARD_GRADIENTS).toContain(a)
expect(QUIZ_CARD_GRADIENTS).toContain(b)
  })
})