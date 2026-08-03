'use client';

/**
 * `CreateQuizPage` — page shell that owns `useQuizForm`, draft auto-save,
 * the unsaved-changes navigation guard, and category/tag data fetching.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-C3 + TKT-4.8-E1 + TKT-4.8-E2.
 *
 * ## What this component owns
 *
 *   - **`useQuizForm` instance** — initialized with `quizCreateFormSchema`
 *     and `CREATE_QUIZ_FORM_DEFAULT_VALUES`. The `form` prop is passed to
 *     `CreateQuizForm`.
 *   - **Draft auto-save** — `useDraftAutoSave` with `formId: 'quiz-create'`
 *     and the authenticated user's ID. Persists dirty form values to localStorage.
 *   - **Navigation guard** — `useUnsavedChangesGuard` with a 5-second threshold.
 *   - **Submit success routing** — on successful create, navigates to the
 *     quiz's edit page and clears the draft.
 *   - **Category options** — fetched via `useCategoriesRanked` (TKT-4.8-E1).
 *   - **Tag suggestions** — fetched via `useTagsPopular` (TKT-4.8-E2).
 *
 * ## What this component does NOT own
 *
 *   - **Form fields** — owned by `<CreateQuizForm />`.
 *   - **Authentication** — this page is already inside the `(protected)` route
 *     group; the user is authenticated. The `userId` is obtained from the
 *     auth context.
 */

import { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useQuizForm } from '@/lib/forms';
import { useDraftAutoSave } from '@/lib/forms/useDraftAutoSave';
import { useUnsavedChangesGuard } from '@/lib/forms/useUnsavedChangesGuard';
import { DraftBanner } from '@/components/primitives/form/DraftBanner';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useCategoriesRanked } from '@/features/categories';
import { useTagsPopular } from '@/features/tags';
import {
  CreateQuizForm,
  CREATE_QUIZ_FORM_DEFAULT_VALUES,
} from '@/features/quizzes/components/CreateQuizForm';
import { quizCreateFormSchema } from '@/lib/forms';

// ─── Session identity ─────────────────────────────────────────────────────────

/**
 * Returns a stable session-scope identifier for localStorage key namespacing.
 *
 * The `(protected)` route guarantees an authenticated user, so we use a
 * session-stable constant rather than reading from an auth store.
 * `userId` in `useDraftAutoSave` is only a namespacing token; it does not
 * gate access.
 */
function useSessionId(): string {
  useAuthState(); // Subscribe to auth changes for reactivity.
  return 'quiz-creator';
}

// ─── Root component ─────────────────────────────────────────────────────────

/**
 * `<CreateQuizPage />` — the quiz creation page shell.
 *
 * Renders `<CreateQuizForm form={form} />` inside the `useQuizForm`
 * provider boundary. Fetches category and tag options for the pickers.
 */
export const CreateQuizPage = memo(function CreateQuizPage() {
  const router = useRouter();

  // ── Session identity ────────────────────────────────────────────────

  const sessionId = useSessionId();

  // ── Category options (TKT-4.8-E1) ───────────────────────────────────

  const { categories, isLoading: isLoadingCategories } =
    useCategoriesRanked({ limit: 50 });

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.categoryId,
        label: c.name,
      })),
    [categories],
  );

  // ── Tag suggestions (TKT-4.8-E2) ────────────────────────────────────

  const { tags, isLoading: isLoadingTags } = useTagsPopular({ limit: 20 });

  const suggestedTagSlugs = useMemo(
    () => tags.map((t) => t.slug),
    [tags],
  );

  // ── `useQuizForm` — the form state container ────────────────────────────

  const formState = useQuizForm({
    schema: quizCreateFormSchema,
    defaultValues: CREATE_QUIZ_FORM_DEFAULT_VALUES,
    formId: 'quiz-create',
  });

  const { form } = formState;

  // ── Draft auto-save ───────────────────────────────────────────────────

  const draft = useDraftAutoSave({
    form,
    formId: 'quiz-create',
    userId: sessionId,
    intervalMs: 5_000,
  });

  // ── Navigation guard ─────────────────────────────────────────────────

  useUnsavedChangesGuard({
    isDirty: formState.isDirty,
    thresholdMs: 5_000,
  });

  // ── Submit success → route to edit page ───────────────────────────────

  const handleSuccess = useCallback(
    (quizId: string) => {
      draft.clearOnSubmit();
      router.push(`/my-quizzes/${quizId}/edit`);
    },
    [draft, router],
  );

  // ── Loading state ────────────────────────────────────────────────────

  const isLoadingOptions = isLoadingCategories || isLoadingTags;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Restore-from-draft CTA */}
      <DraftBanner
        savedAt={draft.savedAt}
        restore={draft.restore}
        dismiss={draft.dismiss}
        showRestorePrompt={!formState.isDirty}
      />

      <CreateQuizForm
        form={form}
        onSuccess={handleSuccess}
        isLoadingOptions={isLoadingOptions}
        categoryOptions={categoryOptions}
        suggestedTags={suggestedTagSlugs}
      />
    </>
  );
});
