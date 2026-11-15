"use client";

import { memo, useCallback } from "react";
import { FormProvider } from "react-hook-form";
import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { TextField } from "@/components/primitives/form/TextField";
import { RichTextArea } from "@/components/primitives/form/RichTextArea";
import { TagMultiSelect } from "@/components/primitives/form/TagMultiSelect";
import { DifficultySelect } from "@/components/primitives/form/DifficultySelect";
import { ImageUploadField } from "@/components/primitives/form/ImageUploadField";
import { FormErrorBanner } from "@/components/primitives/form/FormErrorBanner";
import { QuizSlugField } from "@/features/quizzes/components/QuizSlugField";
import { quizCreateFormSchema, type QuizCreateFormValues } from "@/lib/forms";
import { useCreateQuiz } from "@/features/quizzes/hooks/useCreateQuiz";
import { useTagSlugsToIds } from "@/features/quizzes/hooks/useTagSlugsToIds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

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
        skipAcknowledgements: true, // Already validated by zod.
      });
    } catch {
      // Error is classified and surfaced via `createQuiz.error` by the
      // hooks. No action needed here.
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

  const titleValue = form.getValues("title") ?? "";

  return (
    <FormProvider {...(form as unknown as Parameters<typeof FormProvider>[0])}>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
        {/* Form-level error */}
        {bannerError ? (
          <FormErrorBanner
            lastError={bannerError}
            onDismiss={() => createQuiz.resetError()}
          />
        ) : null}

        {/* Cover image */}
        <ImageUploadField<z.ZodType<QuizCreateFormValues>>
          name="imagePublicId"
          label="Cover Image"
          description="Optional. Recommended: 1200×630px, max 8 MB. PNG, JPG, or WEBP."
          purpose="quiz"
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
              <div
                className="h-9 w-full rounded-md border border-input bg-muted animate-pulse"
                aria-hidden="true"
              />
            ) : (
              <Select
                value={form.getValues("categoryId") ?? ""}
                onValueChange={(value) => {
                  form.setValue("categoryId", value ? (value as never) : null);
                }}
              >
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.slice(0, 15).map((slug) => {
                    const isSelected = (
                      form.getValues("tagSlugs") ?? []
                    ).includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        data-testid={`tag-suggestion-${slug}`}
                        disabled={isSelected || isSubmitting}
                        onClick={() => {
                          if (!isSelected) {
                            form.setValue("tagSlugs", [
                              ...(form.getValues("tagSlugs") ?? []),
                              slug,
                            ]);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                          isSelected
                            ? "border-primary/40 bg-primary/10 text-muted-foreground cursor-not-allowed"
                            : "border-border bg-background hover:bg-muted hover:border-muted-foreground/40 cursor-pointer",
                        )}
                      >
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground/50"
                          >
                            +
                          </span>
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
        <fieldset className="space-y-4">
          <legend className="sr-only">Quiz Settings</legend>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="durationMs">Time Limit</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.max(
                      1,
                      Math.round(
                        (form.getValues("initialVersion.durationMs") ?? 60000) /
                          60000,
                      ),
                    )}{" "}
                    min (
                    {(
                      (form.getValues("initialVersion.durationMs") ?? 60000) /
                      1000
                    ).toLocaleString()}
                    s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="durationMs"
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums"
                    value={form.getValues("initialVersion.durationMs") ?? 60000}
                    onChange={(e) => {
                      form.setValue(
                        "initialVersion.durationMs",
                        parseInt(e.target.value, 10) || 0,
                        { shouldDirty: true },
                      );
                    }}
                    disabled={isSubmitting}
                    min={1000}
                    step={1000}
                    aria-describedby="durationMs-hint"
                  />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    ms
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">
                    Presets:
                  </span>
                  {[
                    { label: "1m", ms: 60000 },
                    { label: "3m", ms: 180000 },
                    { label: "5m", ms: 300000 },
                    { label: "10m", ms: 600000 },
                    { label: "15m", ms: 900000 },
                  ].map((preset) => {
                    const current =
                      form.getValues("initialVersion.durationMs") ?? 60000;
                    const isSelected = current === preset.ms;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          form.setValue(
                            "initialVersion.durationMs",
                            preset.ms,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        disabled={isSubmitting}
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-md border font-mono transition-colors cursor-pointer",
                          isSelected
                            ? "bg-brand text-white border-brand font-semibold shadow-xs"
                            : "bg-muted/60 hover:bg-muted border-border text-muted-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p
                  id="durationMs-hint"
                  className="text-xs text-muted-foreground"
                >
                  Choose a quick preset or enter custom milliseconds (e.g.
                  60,000 = 1 min).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Passing score */}
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <input
                  id="passingScore"
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums"
                  value={
                    form.getValues("initialVersion.passingScorePercent") ?? 70
                  }
                  onChange={(e) => {
                    form.setValue(
                      "initialVersion.passingScorePercent",
                      parseInt(e.target.value, 10) || 0,
                    );
                  }}
                  disabled={isSubmitting}
                  min={0}
                  max={100}
                  step={1}
                  aria-describedby="passingScore-hint"
                />
                <p
                  id="passingScore-hint"
                  className="text-xs text-muted-foreground"
                >
                  Minimum percentage required to pass the quiz.
                </p>
              </div>

              {/* XP reward */}
              <div className="space-y-2">
                <Label htmlFor="rewardXp">XP Reward</Label>
                <input
                  id="rewardXp"
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums"
                  value={form.getValues("initialVersion.rewardXp") ?? 100}
                  onChange={(e) => {
                    form.setValue(
                      "initialVersion.rewardXp",
                      parseInt(e.target.value, 10) || 0,
                    );
                  }}
                  disabled={isSubmitting}
                  min={0}
                  step={1}
                  aria-describedby="rewardXp-hint"
                />
                <p id="rewardXp-hint" className="text-xs text-muted-foreground">
                  Enter the amount of XP earned for completing this quiz.
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Acknowledgements */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="acknowledgements"
            checked={form.getValues("acknowledgements") ?? false}
            onCheckedChange={(checked) => {
              form.setValue("acknowledgements", checked === true);
            }}
            disabled={isSubmitting}
            aria-label="I confirm these settings are correct"
          />
          <div className="space-y-1">
            <Label
              htmlFor="acknowledgements"
              className="cursor-pointer text-sm font-normal leading-snug"
            >
              I confirm that these quiz settings are correct and I have reviewed
              the content for accuracy.
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
            disabled={isSubmitting || !form.formState.isDirty}
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
              "Create Draft"
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

export { quizCreateFormSchema };
export type { QuizCreateFormValues };
