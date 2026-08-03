/**
 * `/my-quizzes` — author's quiz dashboard route.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E2.
 *
 * Thin route entry that delegates to `<MyQuizzesDashboardPage />`.
 * No wrapper divs — the page layout is inherited from the `(protected)`
 * layout group.
 */

import { MyQuizzesDashboardPage } from "@/features/quizzes/components/MyQuizzesDashboardPage";

export default function MyQuizzesPage(): React.ReactElement {
  return <MyQuizzesDashboardPage />;
}
