'use client';

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

function useSessionId(): string {
useAuthState();
return 'quiz-creator';
}

export const CreateQuizPage = memo(function CreateQuizPage() {
const router = useRouter();

const sessionId = useSessionId();

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

const { tags, isLoading: isLoadingTags } = useTagsPopular({ limit: 20 });

const suggestedTagSlugs = useMemo(
() => tags.map((t) => t.slug),
[tags],
  );

const formState = useQuizForm({
schema: quizCreateFormSchema,
defaultValues: CREATE_QUIZ_FORM_DEFAULT_VALUES,
formId: 'quiz-create',
  });

const { form } = formState;

const draft = useDraftAutoSave({
form,
formId: 'quiz-create',
userId: sessionId,
intervalMs: 5_000,
  });

useUnsavedChangesGuard({
isDirty: formState.isDirty,
thresholdMs: 5_000,
  });

const handleSuccess = useCallback(
(quizId: string) => {
draft.clearOnSubmit();
router.push(`/my-quizzes/${quizId}/edit`);
    },
[draft, router],
  );

const isLoadingOptions = isLoadingCategories || isLoadingTags;

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
