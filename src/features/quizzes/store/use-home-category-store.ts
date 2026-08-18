

import { create } from 'zustand'

import type { HomeRailCategory } from '@/features/quizzes/types/home-rails'

type HomeCategoryData = HomeRailCategory

export const useHomeCategoryStore = create<HomeCategoryData>()(() => ({}))

export function setTrendingCategory(
categoryId: string | undefined,
): void {
useHomeCategoryStore.setState((state) => {
const next: HomeCategoryData = { ...state }
if (categoryId === undefined) {
delete next.trendingCategoryId
    } else {
next.trendingCategoryId = categoryId
    }
return next
  }, true)
}

export function setPopularCategory(
categoryId: string | undefined,
): void {
useHomeCategoryStore.setState((state) => {
const next: HomeCategoryData = { ...state }
if (categoryId === undefined) {
delete next.popularCategoryId
    } else {
next.popularCategoryId = categoryId
    }
return next
  }, true)
}

export function resetHomeCategory(): void {
useHomeCategoryStore.setState(() => ({}), true)
}

export const useTrendingCategoryId = () =>
useHomeCategoryStore((state) => state.trendingCategoryId)

export const usePopularCategoryId = () =>
useHomeCategoryStore((state) => state.popularCategoryId)
