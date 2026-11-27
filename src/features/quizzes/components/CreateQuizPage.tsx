"use client";

import { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Clock, Compass, Sparkles } from "lucide-react";

import { quizCreateFormSchema, useQuizForm } from "@/lib/forms";
import { useDraftAutoSave } from "@/lib/forms/useDraftAutoSave";
import { useUnsavedChangesGuard } from "@/lib/forms/useUnsavedChangesGuard";

import { PAGE_GUTTER_CLASS } from "@/shared/layout/constants";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useCategoriesRanked } from "@/features/categories";
import {
  CREATE_QUIZ_FORM_DEFAULT_VALUES,
  CreateQuizForm,
} from "@/features/quizzes/components/CreateQuizForm";
import { useTagsPopular } from "@/features/tags";

import { DraftBanner } from "@/components/primitives/form/DraftBanner";

export const CreateQuizPage = memo(function CreateQuizPage() {
  const router = useRouter();
  const { currentUserId } = useAuthSession();
  const sessionId = currentUserId ?? "anonymous";

  const { categories, isLoading: isLoadingCategories } = useCategoriesRanked({
    limit: 50,
  });

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.categoryId,
        label: c.name,
      })),
    [categories],
  );

  const { tags, isLoading: isLoadingTags } = useTagsPopular({ limit: 20 });

  const suggestedTagSlugs = useMemo(() => tags.map((t) => t.slug), [tags]);

  const formState = useQuizForm({
    schema: quizCreateFormSchema,
    defaultValues: CREATE_QUIZ_FORM_DEFAULT_VALUES,
    formId: "quiz-create",
  });

  const { form } = formState;

  const draft = useDraftAutoSave({
    form,
    formId: "quiz-create",
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
    <div className="min-h-screen bg-background" data-testid="create-quiz-page">
      {/* Authoritative Studio Header */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-xs">
        <div className={`${PAGE_GUTTER_CLASS} py-6`}>
          {/* Breadcrumb / Back Navigation */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/my-quizzes"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md px-1 py-0.5 -ml-1"
              aria-label="Return to My Quizzes dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              <span>Back to My Quizzes</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 shadow-xs">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
                    Quiz Studio
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground">Draft Mode</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Create New Quiz
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Set up your quiz identity, discovery metadata, and gameplay parameters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {draft.savedAt ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground shadow-xs"
                  data-testid="draft-status-pill"
                >
                  <Clock className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  <span>Draft auto-saving enabled</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  <Compass className="h-3.5 w-3.5 text-brand/70" aria-hidden="true" />
                  <span>New Creation</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Deck */}
      <main className={`${PAGE_GUTTER_CLASS} py-6 md:py-8 space-y-6`}>
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
      </main>
    </div>
  );
});
