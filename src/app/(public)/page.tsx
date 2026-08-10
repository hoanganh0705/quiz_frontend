import { listCategories } from '@/features/categories/services'
import { HomePage } from '@/features/quizzes'
import type { Category } from '@/features/categories/types'

export default async function QuizHubDashboard() {
  let categories: Category[] = []

  try {
    // Categories are the only data the route fetches server-side.
    // The three rails in <HomePage /> fetch featured / trending /
    // popular quizzes via SWR hooks on the client. The legacy
    // `listQuizzes({ limit: 8 })` "Latest Quizzes" fetch has been
    // removed (TKT-3.7.D2).
    const categoriesData = await listCategories({ limit: 20 })
    // The backend returns `{ data: CategoryResponseDto[], meta: ... }`.
    // If `data` is missing (e.g. an empty envelope), fall back to `[]`
    // instead of propagating `undefined` to the client component.
    categories = Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : []
  } catch {
    // Fall back to empty array — don't break the page (the previous
    // route used the same defensive try/catch pattern).
  }

  return <HomePage categories={categories} />
}
