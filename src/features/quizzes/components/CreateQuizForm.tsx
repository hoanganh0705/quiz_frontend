'use client';

/**
 * `CreateQuizForm` — the quiz creation authoring form.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-C2.
 *
 * ## What this component owns
 *
 *   - **All form fields** — title, description, category, tags, difficulty,
 *     duration, passing score, XP, slug, cover image, acknowledgements.
 *   - **Field validation** — each field is wired through `useQuizForm`'s
 *     zod resolver via `useController` (inside each atom).
 *   - **Submit handler** — validates, resolves tag slugs to UUIDs, then calls
 *     `useCreateQuiz.submit()`.
 *   - **Error surfacing** — per-field errors from zod; form-level errors
 *     via `<FormErrorBanner lastError={lastError} />`.
 *
 * ## What this component does NOT own
 *
 *   - **`useQuizForm`** — owned by `CreateQuizPage`. The form instance is
 *     received as a prop.
 *   - **Draft auto-save / navigation guard** — owned by `CreateQuizPage`.
 *   - **Tag resolution state** — `useTagSlugsToIds` is mounted here because
 *     resolution must happen before submit, but `CreateQuizPage` can also
 *     share it for pre-fetching.
 *
 * ## Tag slugs → tag IDs
 *
 * `CreateQuizDto` expects `tagIds: string[]` (UUIDs). The form uses
 * `<TagMultiSelect />` which produces `tagSlugs: string[]`. This component
 * resolves slugs → UUIDs via `useTagSlugsToIds` before calling
 * `useCreateQuiz.submit()`.
 *
 * ## Layout
 *
 * The form renders in a single column with logical field groupings:
 *   - Cover image (top)
 *   - Title + slug
 *   - Description
 *   - Category + tags
 *   - Initial version settings (difficulty, duration, passing score, XP)
 *   - Acknowledgements
 *   - Submit
 */

import { memo, useCallback } from 'react';
import { FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { TextField } from '@/components/primitives/form/TextField';
import { RichTextArea } from '@/components/primitives/form/RichTextArea';
import { TagMultiSelect } from '@/components/primitives/form/TagMultiSelect';
import { DifficultySelect } from '@/components/primitives/form/DifficultySelect';
import { ImageUploadField } from '@/components/primitives/form/ImageUploadField';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { QuizSlugField } from '@/features/quizzes/components/QuizSlugField';
import {
  quizCreateFormSchema,
  type QuizCreateFormValues,
} from '@/lib/forms';
import { useCreateQuiz } from '@/features/quizzes/hooks/useCreateQuiz';
import { useTagSlugsToIds } from '@/features/quizzes/hooks/useTagSlugsToIds';

// ─── Default values ─────────────────────────────────────────────────────────────

/**
 * Default values for the create quiz form.
 * `acknowledgements` defaults to `false` (the zod schema enforces acknowledgement).
 */
export const CREATE_QUIZ_FORM_DEFAULT_VALUES: QuizCreateFormValues = {
  title: '',
  description: null,
  slug: null,
  requirements: null,
  imageUrl: null,
  isFeatured: null,
  isHidden: null,
  categoryId: null,
  tagSlugs: [],
  initialVersion: {
    difficulty: 'medium',
    durationMs: 60000,
    passingScorePercent: 70,
    rewardXp: 100,
  },
  acknowledgements: false,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface CreateQuizFormProps {
  /**
   * The `form` instance returned by `useQuizForm()`. The parent owns
   * `useQuizForm`; this component renders the fields inside the
   * `FormProvider` boundary.
   */
  form: UseFormReturn<QuizCreateFormValues>;
  /**
   * Called when the form submits successfully. The parent (typically
   * `CreateQuizPage`) uses this to trigger navigation to
   * `/my-quizzes/[id]/edit`.
   */
  onSuccess?: (quizId: string, slug: string) => void;
  /**
   * Optional loading skeleton state — rendered while category/tag lists load.
   * When `true`, the form fields are replaced with skeletons.
   */
  isLoadingOptions?: boolean;
  /**
   * Optional list of category options to render in the category select.
   * Each entry is `{ value: string; label: string }`.
   */
  categoryOptions?: Array<{ value: string; label: string }>;
  /**
   * Optional list of suggested tag slugs to render below the tag picker.
   * Populated from `useTagsPopular` in `CreateQuizPage` (TKT-4.8-E2).
   */
  suggestedTags?: string[];
}

// ─── Root component ─────────────────────────────────────────────────────────────

/**
 * `<CreateQuizForm form onSuccess? />` — the quiz creation authoring form.
 *
 * Receives the `useQuizForm` form instance from the parent so that
 * `CreateQuizPage` can also mount `useDraftAutoSave` and
 * `useUnsavedChangesGuard` on the same instance.
 */
export const CreateQuizForm = memo(function CreateQuizForm({
  form,
  onSuccess,
  isLoadingOptions = false,
  categoryOptions = [],
  suggestedTags = [],
}: CreateQuizFormProps) {
  // `useCreateQuiz` — the mutation hook.
  // `onSuccess` is called by `useCreateQuiz` internally (TKT-4.8-B1).
  // The `onSuccess` prop on this component is the external callback for
  // callers of `<CreateQuizForm>` (e.g. `CreateQuizPage`) who need to
  // react to the create result.
  const createQuiz = useCreateQuiz({
    onSuccess:
      onSuccess != null
        ? (result) => {
            onSuccess(result.id, result.slug);
          }
        : undefined,
  });

  // `useTagSlugsToIds` — resolves tag slugs to UUIDs before submit.
  const tagResolver = useTagSlugsToIds();

  // Submit handler: validate → resolve tags → call API.
  const handleSubmit = useCallback(async () => {
    // Re-validate all fields with zod.
    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();

    // Resolve tag slugs → UUIDs.
    let resolvedTagIds: string[] | undefined;
    if (values.tagSlugs.length > 0) {
      const result = await tagResolver.resolve(values.tagSlugs);
      if (result === null) {
        // Resolution failed — the tagResolver.error is surfaced below.
        return;
      }
      resolvedTagIds = result;
    }

    try {
      await createQuiz.submit(values, {
        resolvedTagIds,
        skipAcknowledgements: true, // Already validated by zod.
      });
    } catch {
      // Error is classified and surfaced via `createQuiz.error` by the
      // hooks. No action needed here.
    }
  }, [form, createQuiz, tagResolver]);

  // Combined `isSubmitting` — true when the form is validating or
  // when the API call is in flight.
  const isSubmitting = form.formState.isSubmitting || createQuiz.isSubmitting;

  // Build the banner error from `createQuiz.error` (ApiError) or
  // `tagResolver.error`. Slug conflict (409) is shown inline via
  // `<QuizSlugField />`; banner is for scope-wide errors.
  const bannerError = (() => {
    if (createQuiz.error) {
      const code = createQuiz.error.code;
      // 409 slug conflict → shown inline by QuizSlugField; skip banner.
      if (code === 'QUIZ_SLUG_CONFLICT') return null;
      return {
        title: 'Quiz creation failed',
        body:
          code === 'GLOBAL_RATE_LIMITED'
            ? 'Slow down — try again in a minute.'
            : 'Something went wrong. Please try again.',
        code,
      };
    }
    if (tagResolver.error) {
      return {
        title: 'Could not resolve tags',
        body: tagResolver.error,
        code: 'GLOBAL_UNKNOWN',
      };
    }
    return null;
  })();

  const titleValue = form.getValues('title') ?? '';

  return (
    <FormProvider
      {...((form as unknown) as Parameters<typeof FormProvider>[0])}
    >
      <div className="space-y-8">
        {/* Form-level error */}
        {bannerError ? (
          <FormErrorBanner
            lastError={bannerError}
            onDismiss={() => createQuiz.resetError()}
          />
        ) : null}

        {/* Cover image */}
        <ImageUploadField<z.ZodType<QuizCreateFormValues>>
          name="imageUrl"
          label="Cover Image"
          description="Optional. Recommended: 1200×630px, max 5 MB. PNG, JPG, or WEBP."
        />

        {/* Title */}
        <TextField<z.ZodType<QuizCreateFormValues>>
          name="title"
          label="Quiz Title"
          placeholder="e.g. World History Quiz"
          required
        />

        {/* Slug + auto-derivation preview */}
        <QuizSlugField<z.ZodType<QuizCreateFormValues>>
          name="slug"
          titleValue={titleValue}
          description="Optional. If left blank, a slug is auto-generated from the title."
          placeholder="my-quiz-slug"
        />

        {/* Description */}
        <RichTextArea<z.ZodType<QuizCreateFormValues>>
          name="description"
          label="Description"
          description="Optional. Supports markdown."
          placeholder="Describe what this quiz is about…"
          maxLength={2000}
        />

        {/* Category + Tags row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            {isLoadingOptions ? (
              <div className="h-10 w-full animate-pulse rounded-md border border-input bg-muted" />
            ) : (
              <select
                id="categoryId"
                data-testid="category-select"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                onChange={(e) => {
                  form.setValue(
                    'categoryId',
                    e.target.value
                      ? (e.target.value as never)
                      : null,
                  );
                }}
                value={form.getValues('categoryId') ?? ''}
              >
                <option value="">No category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <TagMultiSelect<z.ZodType<QuizCreateFormValues>>
              name="tagSlugs"
              label="Tags"
              description="Press Enter or comma to add. Max 10 tags."
              max={10}
              placeholder="Add tags…"
              testId="tag-multi-select"
            />
            {/* Suggested tags (TKT-4.8-E2) */}
            {suggestedTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Suggestions:
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.slice(0, 15).map((slug) => {
                    const isSelected = (form.getValues('tagSlugs') ?? []).includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        data-testid={`tag-suggestion-${slug}`}
                        disabled={isSelected || isSubmitting}
                        onClick={() => {
                          if (!isSelected) {
                            form.setValue('tagSlugs', [
                              ...(form.getValues('tagSlugs') ?? []),
                              slug,
                            ]);
                          }
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-muted-foreground cursor-not-allowed'
                            : 'border-border bg-background hover:bg-muted hover:border-muted-foreground/40 cursor-pointer',
                        )}
                      >
                        {isSelected ? (
                          <span aria-hidden="true" className="text-muted-foreground">✓</span>
                        ) : (
                          <span aria-hidden="true" className="text-muted-foreground/50">+</span>
                        )}
                        {slug}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Initial version settings */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quiz Settings
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Difficulty */}
            <DifficultySelect<z.ZodType<QuizCreateFormValues>>
              name="initialVersion.difficulty"
              label="Difficulty"
              description="How challenging is this quiz?"
            />

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="durationMs">Time Limit (ms)</Label>
              <input
                id="durationMs"
                type="number"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.getValues('initialVersion.durationMs') ?? 60000}
                onChange={(e) => {
                  form.setValue(
                    'initialVersion.durationMs',
                    parseInt(e.target.value, 10) || 0,
                  );
                }}
                disabled={isSubmitting}
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Passing score */}
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <input
                id="passingScore"
                type="number"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={
                  form.getValues('initialVersion.passingScorePercent') ?? 70
                }
                onChange={(e) => {
                  form.setValue(
                    'initialVersion.passingScorePercent',
                    parseInt(e.target.value, 10) || 0,
                  );
                }}
                disabled={isSubmitting}
                min={0}
                max={100}
              />
            </div>

            {/* XP reward */}
            <div className="space-y-2">
              <Label htmlFor="rewardXp">XP Reward</Label>
              <input
                id="rewardXp"
                type="number"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.getValues('initialVersion.rewardXp') ?? 100}
                onChange={(e) => {
                  form.setValue(
                    'initialVersion.rewardXp',
                    parseInt(e.target.value, 10) || 0,
                  );
                }}
                disabled={isSubmitting}
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Acknowledgements */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="acknowledgements"
            checked={form.getValues('acknowledgements') ?? false}
            onCheckedChange={(checked) => {
              form.setValue('acknowledgements', checked === true);
            }}
            disabled={isSubmitting}
            aria-label="I confirm these settings are correct"
          />
          <div className="space-y-1">
            <Label
              htmlFor="acknowledgements"
              className="cursor-pointer text-sm font-normal leading-snug"
            >
              I confirm that these quiz settings are correct and I have
              reviewed the content for accuracy.
            </Label>
            {form.formState.errors.acknowledgements?.message ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.acknowledgements.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            type="button"
            disabled={
              isSubmitting ||
              !form.formState.isDirty ||
              !form.getValues('acknowledgements')
            }
            onClick={handleSubmit}
            className="gap-2"
            aria-label="Create quiz draft"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating…
              </>
            ) : (
              'Create Draft'
            )}
          </Button>
          {form.formState.isDirty && !isSubmitting && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes.
            </p>
          )}
        </div>
      </div>
    </FormProvider>
  );
});

// Re-export schema + types for convenience.
export { quizCreateFormSchema };
export type { QuizCreateFormValues };
