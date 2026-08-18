

import { create } from 'zustand'

import type { QuizFilterUrlState } from '@/features/quizzes/types/quiz-filter-params'
import {
parseQuizFilterUrl,
serializeQuizFilterUrl,
} from '@/features/quizzes/types/quiz-filter-params'

type QuizFiltersData = QuizFilterUrlState

export const useQuizFiltersStore = create<QuizFiltersData>()(() => ({}))

export function setFilter<K extends keyof QuizFilterUrlState>(
key: K,
value: QuizFilterUrlState[K]
): void {
useQuizFiltersStore.setState((state) => {
const next: QuizFilterUrlState = { ...state }
if (value === undefined) {
delete next[key]
    } else {
next[key] = value
    }
return next
  }, true)
}

export function setFromUrlSearchParams(params: URLSearchParams): void {
useQuizFiltersStore.setState(() => parseQuizFilterUrl(params), true)
}

export function getUrlSearchParams(): URLSearchParams {
return serializeQuizFilterUrl(useQuizFiltersStore.getState())
}

export function resetFilters(): void {
useQuizFiltersStore.setState(() => ({}), true)
}

export const useQuizFiltersCategoryId = () =>
useQuizFiltersStore((state) => state.categoryId)

export const useQuizFiltersTagSlugs = () =>
useQuizFiltersStore((state) => state.tagSlugs)

export const useQuizFiltersSort = () =>
useQuizFiltersStore((state) => state.sort)

export const useQuizFiltersDifficulty = () =>
useQuizFiltersStore((state) => state.difficulty)
