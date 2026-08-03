/**
 * Loading state for `/my-quizzes/[id]/edit`.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.8.
 *
 * Renders the edit page skeleton while the route segment is loading.
 */

import { QuizEditPageSkeleton } from '@/features/quizzes/components/QuizEditPageSkeleton';

export default function Loading(): React.ReactElement {
  return <QuizEditPageSkeleton />;
}
