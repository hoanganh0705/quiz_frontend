"use client";

import { memo, useCallback } from "react";

import {
  BookOpen,
  Image as ImageIcon,
  Rocket,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import { FormProvider } from "react-hook-form";

import { quizCreateFormSchema, type QuizCreateFormValues } from "@/lib/forms";

import { QuizSlugField } from "@/features/quizzes/components/QuizSlugField";
import { useCreateQuiz } from "@/features/quizzes/hooks/useCreateQuiz";
import { useTagSlugsToIds } from "@/features/quizzes/hooks/useTagSlugsToIds";

import { FormErrorBanner } from "@/components/primitives/form/FormErrorBanner";
import { ImageUploadField } from "@/components/primitives/form/ImageUploadField";
import { RichTextArea } from "@/components/primitives/form/RichTextArea";
import { TagMultiSelect } from "@/components/primitives/form/TagMultiSelect";
import { TextField } from "@/components/primitives/form/TextField";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import {
  AcknowledgementsField,
  CategoryField,
  DURATION_PRESETS,
  QuizSettingsSection,
  SubmitSection,
  SuggestedTags,
  formatDurationSummary,
} from "./CreateQuizFormSections";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

export { DURATION_PRESETS, formatDurationSummary };

export const CREATE_QUIZ_FORM_DEFAULT_VALUES: QuizCreateFormValues = {
  title: "",
  description: null,
  slug: null,
  requirements: null,
  imagePublicId: null,
  isFeatured: null,
  isHidden: null,
  categoryId: null,
  tagSlugs: [],
  initialVersion: {
    difficulty: "medium",
    durationMs: 60000,
    passingScorePercent: 70,
    rewardXp: 100,
  },
  acknowledgements: false,
};

export interface CreateQuizFormProps {
  form: UseFormReturn<QuizCreateFormValues>;

  onSuccess?: (quizId: string, slug: string) => void;

  isLoadingOptions?: boolean;

  categoryOptions?: Array<{ value: string; label: string }>;

  suggestedTags?: string[];
}

export const CreateQuizForm = memo(function CreateQuizForm({
  form,
  onSuccess,
  isLoadingOptions = false,
  categoryOptions = [],
  suggestedTags = [],
}: CreateQuizFormProps) {
  const createQuiz = useCreateQuiz({
    onSuccess:
      onSuccess != null
        ? (result) => {
            onSuccess(result.id, result.slug);
          }
        : undefined,
  });

  const tagResolver = useTagSlugsToIds();

  const handleSubmit = useCallback(async () => {
    if (!form.getValues("acknowledgements")) {
      form.setError("acknowledgements", {
        type: "manual",
        message:
          "Please confirm that you have reviewed the settings before creating the draft.",
      });
      return;
    }

    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();

    let resolvedTagIds: string[] | undefined;
    if (values.tagSlugs.length > 0) {
      const result = await tagResolver.resolve(values.tagSlugs);
      if (result === null) {
        return;
      }
      resolvedTagIds = result;
    }

    try {
      await createQuiz.submit(values, {
        resolvedTagIds,
        skipAcknowledgements: true,
      });
    } catch {
      // Error is classified and surfaced via `createQuiz.error` by the hooks.
    }
  }, [form, createQuiz, tagResolver]);

  const isSubmitting = form.formState.isSubmitting || createQuiz.isSubmitting;

  const bannerError = (() => {
    if (createQuiz.error) {
      const code = createQuiz.error.code;

      if (code === "QUIZ_SLUG_CONFLICT") return null;
      return {
        title: "Quiz creation failed",
        body:
          code === "GLOBAL_RATE_LIMITED"
            ? "Slow down — try again in a minute."
            : "Something went wrong. Please try again.",
        code,
      };
    }
    if (tagResolver.error) {
      return {
        title: "Could not resolve tags",
        body: tagResolver.error,
        code: "GLOBAL_UNKNOWN",
      };
    }
    return null;
  })();

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        noValidate
        className="space-y-6"
      >
        {bannerError ? (
          <FormErrorBanner
            lastError={bannerError}
            onDismiss={() => createQuiz.resetError()}
          />
        ) : null}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Card className="border-border/60 bg-card/60 shadow-xs backdrop-blur-xs">
              <CardHeader className="border-b border-border/40 px-6 pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
                  <BookOpen className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Quiz Identity & Details</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  The essential title, slug, and description players see in the
                  catalog.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <TextField<z.ZodType<QuizCreateFormValues>>
                  name="title"
                  label="Quiz Title"
                  placeholder="e.g. World History Masters"
                  required
                />

                <QuizSlugField<z.ZodType<QuizCreateFormValues>>
                  name="slug"
                  description="Optional. If left blank, a slug is auto-generated from the title."
                  placeholder="my-quiz-slug"
                />

                <RichTextArea<z.ZodType<QuizCreateFormValues>>
                  name="description"
                  label="Description"
                  description="Optional. Supports markdown formatting."
                  placeholder="Describe what this quiz covers and why players should challenge themselves…"
                  maxLength={2000}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-xs backdrop-blur-xs">
              <CardHeader className="border-b border-border/40 px-6 pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
                  <Tags className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Discovery & Categorization</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  Help learners find your quiz by category and topic tags.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <CategoryField
                  isLoading={isLoadingOptions}
                  categoryOptions={categoryOptions}
                  disabled={isSubmitting}
                />

                <div className="space-y-2">
                  <TagMultiSelect<z.ZodType<QuizCreateFormValues>>
                    name="tagSlugs"
                    label="Tags"
                    description="Press Enter or comma to add. Max 10 tags."
                    max={10}
                    placeholder="Add tags…"
                    testId="tag-multi-select"
                  />
                  <SuggestedTags
                    suggestedTags={suggestedTags}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Card className="border-border/60 bg-card/60 shadow-xs backdrop-blur-xs">
              <CardHeader className="border-b border-border/40 px-6 pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <ImageIcon
                    className="h-5 w-5 text-brand"
                    aria-hidden="true"
                  />
                  <span>Cover Media</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  Visual showcase image for the quiz catalog card.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <ImageUploadField<z.ZodType<QuizCreateFormValues>>
                  name="imagePublicId"
                  label="Cover Image"
                  description="Recommended: 1200×630px (16:9), max 8 MB. PNG, JPG, or WEBP."
                  purpose="quiz"
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-xs backdrop-blur-xs">
              <CardHeader className="border-b border-border/40 px-6 pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <SlidersHorizontal
                    className="h-5 w-5 text-brand"
                    aria-hidden="true"
                  />
                  <span>Gameplay Rules & XP</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  Set difficulty tier, time limit, and completion rewards.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <QuizSettingsSection disabled={isSubmitting} />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-xs ring-1 ring-brand/10 backdrop-blur-xs">
              <CardHeader className="border-b border-border/40 px-6 pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <Rocket className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Finalize & Create</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  Confirm settings to initialize the draft and start adding
                  questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <AcknowledgementsField disabled={isSubmitting} />
                <div className="border-t border-border/40 pt-4">
                  <SubmitSection isSubmitting={isSubmitting} />
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="mb-0.5 font-semibold text-foreground">
                    What happens next?
                  </p>
                  <p>
                    Saving this draft unlocks the Question Studio, where you can
                    author questions, set multiple choice answers, and publish.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
});

export { quizCreateFormSchema };
export type { QuizCreateFormValues };
