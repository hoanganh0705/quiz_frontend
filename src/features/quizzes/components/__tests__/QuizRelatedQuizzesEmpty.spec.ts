

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { QuizRelatedQuizzesEmpty } from '@/features/quizzes/components/QuizRelatedQuizzesEmpty'

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

describe('QuizRelatedQuizzesEmpty — barrel-not-exported invariant', () => {
it('is NOT re-exported from `src/features/quizzes/components/index.ts` (the feature barrel)', () => {

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

expect(barrelSource).not.toMatch(/QuizRelatedQuizzesEmpty/)
  })
})
