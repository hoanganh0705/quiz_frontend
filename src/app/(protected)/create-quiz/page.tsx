/**
 * `app/(protected)/create-quiz/page.tsx` — quiz creation route entry.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-D1.
 *
 * Replaces the Phase 1–3 stub (`QuizForm`) with the real `CreateQuizPage`
 * component that owns:
 *   - `useQuizForm` + `quizCreateFormSchema`
 *   - `useDraftAutoSave` (localStorage draft persistence)
 *   - `useUnsavedChangesGuard` (browser navigation guard)
 *   - Submit → route to `/my-quizzes/[id]/edit`
 *
 * P2-21: this page is a thin server-component pass-through. The
 * `'use client'` directive was previously applied here which
 * forced the entire page tree into the client bundle. Dropped.
 *
 * The `loading.tsx` and `layout.tsx` in this directory remain unchanged.
 * `loading.tsx` will be updated in TKT-4.8-E3 to use `CreateQuizFormSkeleton`.
 */

import { CreateQuizPage } from '@/features/quizzes/components/CreateQuizPage';

export default function CreateQuizRoutePage() {
  return <CreateQuizPage />;
}
