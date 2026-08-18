

import type { QuizDifficulty } from './quiz-backend'

export const QUIZ_SORT_VALUES = ['newest', 'popular', 'top_rated', 'trending'] as const

export type QuizSort = (typeof QUIZ_SORT_VALUES)[number]

export type { QuizDifficulty }

export type QuizDifficultyFilter = QuizDifficulty | 'all' | undefined

export interface QuizFilterUrlState {
categoryId?: string
tagSlugs?: string[]
sort?: QuizSort
difficulty?: QuizDifficulty | 'all'
}

export const TAG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidTagSlug(value: string): boolean {
return TAG_SLUG_REGEX.test(value)
}

const isQuizSort = (value: string): value is QuizSort =>
(QUIZ_SORT_VALUES as readonly string[]).includes(value)

const isQuizDifficulty = (
value: string,
): value is QuizDifficulty =>
value === 'easy' || value === 'medium' || value === 'hard'

export function parseQuizFilterUrl(
searchParams: URLSearchParams,
): QuizFilterUrlState {
const state: QuizFilterUrlState = {}

const categoryId = searchParams.get('categoryId')
if (categoryId !== null && categoryId !== '') {
state.categoryId = categoryId
  }

const tagSlugsRaw = searchParams.get('tags')
if (tagSlugsRaw !== null && tagSlugsRaw !== '') {
const tagSlugs = tagSlugsRaw
      .split(',')
      .map((slug) => slug.trim())
      .filter((slug) => slug.length > 0 && isValidTagSlug(slug))
if (tagSlugs.length > 0) {
state.tagSlugs = tagSlugs
    }
  }

const sortRaw = searchParams.get('sort')
if (sortRaw !== null && sortRaw !== '') {
state.sort = isQuizSort(sortRaw) ? sortRaw : 'newest'
  }

const difficultyRaw = searchParams.get('difficulty')
if (difficultyRaw !== null && difficultyRaw !== '') {
if (isQuizDifficulty(difficultyRaw)) {
state.difficulty = difficultyRaw
    } else if (difficultyRaw === 'all') {
state.difficulty = 'all'
    } else {

state.difficulty = undefined
    }
  }

return state
}

export function serializeQuizFilterUrl(
state: QuizFilterUrlState,
): URLSearchParams {
const params = new URLSearchParams()

if (state.categoryId !== undefined && state.categoryId !== '') {
params.set('categoryId', state.categoryId)
  }

if (state.tagSlugs !== undefined && state.tagSlugs.length > 0) {

const validSlugs = state.tagSlugs.filter(isValidTagSlug)
if (validSlugs.length > 0) {
params.set('tags', validSlugs.join(','))
    }
  }

if (state.sort !== undefined) {
params.set('sort', state.sort)
  }

if (state.difficulty !== undefined) {
params.set('difficulty', state.difficulty)
  }

return params
}