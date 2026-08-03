/**
 * `app/(protected)/create-quiz/loading.tsx` — streaming loading state.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-E3 (loading skeleton update).
 *
 * Renders `CreateQuizFormSkeleton` while the page streams / hydrates.
 * The skeleton mirrors the layout of `CreateQuizForm`.
 */

import { CreateQuizFormSkeleton } from '@/features/quizzes/components/CreateQuizFormSkeleton';

export default function CreateQuizLoading() {
  return <CreateQuizFormSkeleton />;
}
