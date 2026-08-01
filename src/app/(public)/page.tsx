import { listCategories } from '@/features/categories/api'
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
    categories = categoriesData.data
  } catch {
    // Fall back to empty array — don't break the page (the previous
    // route used the same defensive try/catch pattern).
  }

  return <HomePage categories={categories} />
}
