/**
 * Loading state for `/my-quizzes`.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E2.
 *
 * Renders the table skeleton while the page is streaming.
 */

import { MyQuizzesSkeleton } from "@/features/quizzes/components/MyQuizzesSkeleton";

export default function Loading(): React.ReactElement {
  return (
    <div className="p-6">
      <MyQuizzesSkeleton />
    </div>
  );
}
