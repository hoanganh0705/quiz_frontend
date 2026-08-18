"use client"

import QuizCategories from '@/features/categories/components/QuizCategories'
import type { Category } from '@/features/categories/types'

export default function QuizCategoriesClient({
categories
}: {
categories: Category[]
}) {
return <QuizCategories categories={categories} />
}
