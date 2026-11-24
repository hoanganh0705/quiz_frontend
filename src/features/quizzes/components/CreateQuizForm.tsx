"use client";

import { memo, useCallback } from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  BookOpen,
  Image as ImageIcon,
  Loader2,
  Rocket,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/shared/utils/merge-class-names";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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

export const DURATION_PRESETS = [
  { label: "1m", ms: 60000 },
  { label: "3m", ms: 180000 },
  { label: "5m", ms: 300000 },
  { label: "10m", ms: 600000 },
  { label: "15m", ms: 900000 },
] as const;

export function formatDurationSummary(sec: number): string {
  if (sec <= 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec > 0 ? `${mins}m ${remSec}s (${sec}s)` : `${mins} min (${sec}s)`;
}

// ---------------------------------------------------------------------------
// Isolated Sub-components (eliminates root useWatch render cascades)
// ---------------------------------------------------------------------------

interface CategoryFieldProps {
  isLoading: boolean;
  categoryOptions: Array<{ value: string; label: string }>;
  disabled: boolean;
}

function CategoryField({
  isLoading,
  categoryOptions,
  disabled,
}: CategoryFieldProps) {
  const { control } = useFormContext<QuizCreateFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor="categoryId">Category</Label>
      {isLoading ? (
        <div
          className="h-9 w-full rounded-md border border-input bg-muted animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value ? value : null);
              }}
              disabled={disabled}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Select a category" />
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
        />
      )}
    </div>
  );
}

interface SuggestedTagsProps {
  suggestedTags: string[];
  disabled: boolean;
}

function SuggestedTags({ suggestedTags, disabled }: SuggestedTagsProps) {
  const { control, setValue } = useFormContext<QuizCreateFormValues>();
  const tagSlugs = (useWatch({ control, name: "tagSlugs" }) as string[]) ?? [];

  if (suggestedTags.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-xs font-medium text-muted-foreground">Quick Suggestions:</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestedTags.slice(0, 15).map((slug) => {
          const isSelected = tagSlugs.includes(slug);
          return (
            <button
              key={slug}
              type="button"
              data-testid={`tag-suggestion-${slug}`}
              disabled={isSelected || disabled}
              onClick={() => {
                if (!isSelected) {
                  setValue("tagSlugs", [...tagSlugs, slug], {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              className={cn(
                "inline-flex items-center gap-1 min-h-[28px] rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 select-none",
                isSelected
                  ? "border-primary/40 bg-primary/10 text-muted-foreground cursor-not-allowed"
                  : "border-border bg-background hover:bg-muted/80 hover:border-primary/40 active:scale-95 cursor-pointer shadow-2xs",
              )}
            >
              {isSelected ? (
                <span aria-hidden="true" className="text-muted-foreground">
                  ✓
                </span>
              ) : (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  +
                </span>
              )}
              {slug}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface QuizSettingsSectionProps {
  disabled: boolean;
}

function QuizSettingsSection({ disabled }: QuizSettingsSectionProps) {
  const { control, setValue, formState } =
    useFormContext<QuizCreateFormValues>();

  const durationMs =
    (useWatch({ control, name: "initialVersion.durationMs" }) as number) ??
    60000;
  const passingScorePercent =
    (useWatch({
      control,
      name: "initialVersion.passingScorePercent",
    }) as number) ?? 70;
  const rewardXp =
    (useWatch({ control, name: "initialVersion.rewardXp" }) as number) ?? 100;

  const durationSeconds = Math.max(0, Math.round(durationMs / 1000));

  const durationError = formState.errors.initialVersion?.durationMs?.message;
  const passingScoreError =
    formState.errors.initialVersion?.passingScorePercent?.message;
  const rewardXpError = formState.errors.initialVersion?.rewardXp?.message;

  return (
    <fieldset className="space-y-5">
      <legend className="sr-only">Quiz Settings</legend>

      {/* Difficulty */}
      <DifficultySelect<z.ZodType<QuizCreateFormValues>>
        name="initialVersion.difficulty"
        label="Difficulty"
        description="How challenging is this quiz?"
        disabled={disabled}
      />

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="durationSeconds">Time Limit</Label>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {formatDurationSummary(durationSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="durationSeconds"
            type="number"
            className="font-mono tabular-nums"
            value={durationSeconds || ""}
            onChange={(e) => {
              const sec = parseInt(e.target.value, 10);
              const val = Number.isNaN(sec) ? 0 : Math.max(0, sec);
              setValue("initialVersion.durationMs", val * 1000, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            disabled={disabled}
            min={1}
            step={1}
            aria-invalid={!!durationError}
            aria-describedby={cn(
              "durationSeconds-hint",
              durationError && "durationSeconds-error",
            )}
          />
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            s
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground mr-1">Presets:</span>
          {DURATION_PRESETS.map((preset) => {
            const isSelected = durationMs === preset.ms;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setValue("initialVersion.durationMs", preset.ms, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center justify-center min-h-[32px] px-3 py-1 text-xs rounded-md border font-mono transition-all duration-150 cursor-pointer select-none active:scale-95",
                  isSelected
                    ? "bg-brand text-brand-foreground border-brand font-semibold shadow-xs"
                    : "bg-muted/60 hover:bg-muted hover:border-brand/40 border-border text-muted-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p id="durationSeconds-hint" className="text-xs text-muted-foreground">
          Choose a quick preset or enter custom seconds (e.g. 60s = 1 min).
        </p>
        {durationError ? (
          <p
            id="durationSeconds-error"
            className="text-xs text-destructive"
            role="alert"
          >
            {durationError}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Passing score */}
        <div className="space-y-2">
          <Label htmlFor="passingScore">Passing Score (%)</Label>
          <Input
            id="passingScore"
            type="number"
            className="font-mono tabular-nums"
            value={passingScorePercent === 0 ? 0 : passingScorePercent || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setValue(
                "initialVersion.passingScorePercent",
                Number.isNaN(val) ? 0 : val,
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            disabled={disabled}
            min={0}
            max={100}
            step={1}
            aria-invalid={!!passingScoreError}
            aria-describedby={cn(
              "passingScore-hint",
              passingScoreError && "passingScore-error",
            )}
          />
          <p id="passingScore-hint" className="text-xs text-muted-foreground">
            Minimum percentage to pass.
          </p>
          {passingScoreError ? (
            <p
              id="passingScore-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {passingScoreError}
            </p>
          ) : null}
        </div>

        {/* XP reward */}
        <div className="space-y-2">
          <Label htmlFor="rewardXp">XP Reward</Label>
          <Input
            id="rewardXp"
            type="number"
            className="font-mono tabular-nums"
            value={rewardXp === 0 ? 0 : rewardXp || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setValue(
                "initialVersion.rewardXp",
                Number.isNaN(val) ? 0 : val,
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            disabled={disabled}
            min={0}
            step={1}
            aria-invalid={!!rewardXpError}
            aria-describedby={cn(
              "rewardXp-hint",
              rewardXpError && "rewardXp-error",
            )}
          />
          <p id="rewardXp-hint" className="text-xs text-muted-foreground">
            XP rewarded on completion.
          </p>
          {rewardXpError ? (
            <p
              id="rewardXp-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {rewardXpError}
            </p>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}

interface AcknowledgementsFieldProps {
  disabled: boolean;
}

function AcknowledgementsField({ disabled }: AcknowledgementsFieldProps) {
  const { control, formState, setValue } =
    useFormContext<QuizCreateFormValues>();
  const acknowledgements =
    (useWatch({ control, name: "acknowledgements" }) as boolean) ?? false;
  const errorMessage = formState.errors.acknowledgements?.message;

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="acknowledgements"
        checked={acknowledgements}
        onCheckedChange={(checked) => {
          setValue("acknowledgements", checked === true, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        disabled={disabled}
        aria-label="I confirm these settings are correct"
        aria-invalid={!!errorMessage}
      />
      <div className="space-y-1">
        <Label
          htmlFor="acknowledgements"
          className="cursor-pointer text-sm font-normal leading-snug"
        >
          I confirm that these quiz settings are correct and I have reviewed
          the content for accuracy.
        </Label>
        {errorMessage ? (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface SubmitSectionProps {
  isSubmitting: boolean;
}

function SubmitSection({ isSubmitting }: SubmitSectionProps) {
  const { control, formState } = useFormContext<QuizCreateFormValues>();
  const title = (useWatch({ control, name: "title" }) as string) ?? "";
  const isSubmitDisabled =
    isSubmitting || (!formState.isDirty && !title.trim());

  return (
    <div className="space-y-3 pt-2">
      <Button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full gap-2 shadow-xs font-semibold cursor-pointer"
        aria-label="Create quiz draft"
      >
        {isSubmitting ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Creating Draft…</span>
          </>
        ) : (
          <>
            <Rocket className="h-4 w-4" aria-hidden="true" />
            <span>Create Draft</span>
          </>
        )}
      </Button>
      {formState.isDirty && !isSubmitting && (
        <p className="text-xs text-muted-foreground text-center">
          You have unsaved changes in this form.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CreateQuizForm
// ---------------------------------------------------------------------------

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

  return (
    <FormProvider {...(form as unknown as Parameters<typeof FormProvider>[0])}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        noValidate
        className="space-y-6"
      >
        {/* Form-level error */}
        {bannerError ? (
          <FormErrorBanner
            lastError={bannerError}
            onDismiss={() => createQuiz.resetError()}
          />
        ) : null}

        {/* Rebalanced 12-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Content & Categorization */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Quiz Identity & Content */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Quiz Identity & Details</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  The essential title, slug, and description players see in the catalog.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Title */}
                <TextField<z.ZodType<QuizCreateFormValues>>
                  name="title"
                  label="Quiz Title"
                  placeholder="e.g. World History Masters"
                  required
                />

                {/* Slug + auto-derivation preview */}
                <QuizSlugField<z.ZodType<QuizCreateFormValues>>
                  name="slug"
                  description="Optional. If left blank, a slug is auto-generated from the title."
                  placeholder="my-quiz-slug"
                />

                {/* Description */}
                <RichTextArea<z.ZodType<QuizCreateFormValues>>
                  name="description"
                  label="Description"
                  description="Optional. Supports markdown formatting."
                  placeholder="Describe what this quiz covers and why players should challenge themselves…"
                  maxLength={2000}
                />
              </CardContent>
            </Card>

            {/* Card 2: Discovery & Categorization */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                  <Tags className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Discovery & Categorization</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Help learners find your quiz by category and topic tags.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
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

          {/* Right Column (5 cols): Media, Rules & Action */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 3: Cover Media */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Cover Media</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Visual showcase image for the quiz catalog card.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <ImageUploadField<z.ZodType<QuizCreateFormValues>>
                  name="imagePublicId"
                  label="Cover Image"
                  description="Recommended: 1200×630px (16:9), max 8 MB. PNG, JPG, or WEBP."
                  purpose="quiz"
                />
              </CardContent>
            </Card>

            {/* Card 4: Gameplay Rules */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Gameplay Rules & XP</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Set difficulty tier, time limit, and completion rewards.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <QuizSettingsSection disabled={isSubmitting} />
              </CardContent>
            </Card>

            {/* Card 5: Finalize & Create */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs ring-1 ring-brand/10">
              <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-brand" aria-hidden="true" />
                  <span>Finalize & Create</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Confirm settings to initialize the draft and start adding questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <AcknowledgementsField disabled={isSubmitting} />
                <div className="border-t border-border/40 pt-4">
                  <SubmitSection isSubmitting={isSubmitting} />
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border/40">
                  <p className="font-semibold text-foreground mb-0.5">
                    What happens next?
                  </p>
                  <p>
                    Saving this draft unlocks the Question Studio, where you can author questions, set multiple choice answers, and publish.
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
