/**
 * `/my-quizzes/[id]/edit` — quiz version edit route.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.8.
 *
 * Thin route entry that delegates to `<QuizEditPage />`.
 * No wrapper divs — the page layout is inherited from the `(protected)`
 * layout group.
 *
 * ## Authentication
 *
 * This route is inside the `(protected)` layout group, which requires
 * authentication. Unauthenticated access redirects to the login page.
 *
 * ## Metadata
 *
 * The page title is set dynamically based on the quiz title once loaded.
 * While loading, a fallback title is used.
 */

import { Suspense } from 'react';

import { QuizEditPage } from '@/features/quizzes/components/QuizEditPage';
import { QuizEditPageSkeleton } from '@/features/quizzes/components/QuizEditPageSkeleton';

export default function QuizEditRoutePage(): React.ReactElement {
  return (
    <Suspense fallback={<QuizEditPageSkeleton />}>
      <QuizEditPage />
    </Suspense>
  );
}
