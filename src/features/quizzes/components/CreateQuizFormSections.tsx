"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Loader2, Rocket } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import { DifficultySelect } from "@/components/primitives/form/DifficultySelect";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

import type { QuizCreateFormValues } from "@/lib/forms";
import type { z } from "zod";

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

export interface CategoryFieldProps {
  isLoading: boolean;
  categoryOptions: Array<{ value: string; label: string }>;
  disabled: boolean;
}

export function CategoryField({
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
          className="h-9 w-full animate-pulse rounded-md border border-input bg-muted motion-reduce:animate-none"
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

export interface SuggestedTagsProps {
  suggestedTags: string[];
  disabled: boolean;
}

export function SuggestedTags({ suggestedTags, disabled }: SuggestedTagsProps) {
  const { control, setValue } = useFormContext<QuizCreateFormValues>();
  const tagSlugs = (useWatch({ control, name: "tagSlugs" }) as string[]) ?? [];

  if (suggestedTags.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-xs font-medium text-muted-foreground">
        Quick Suggestions:
      </p>
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
                "inline-flex min-h-[28px] select-none items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                isSelected
                  ? "cursor-not-allowed border-primary/40 bg-primary/10 text-muted-foreground"
                  : "cursor-pointer border-border bg-background shadow-2xs hover:border-primary/40 hover:bg-muted/80 active:scale-95",
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

export function QuizSettingsSection({ disabled }: { disabled: boolean }) {
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

      <DifficultySelect<z.ZodType<QuizCreateFormValues>>
        name="initialVersion.difficulty"
        label="Difficulty"
        description="How challenging is this quiz?"
        disabled={disabled}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="durationSeconds">Time Limit</Label>
          <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
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
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            s
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="mr-1 text-xs text-muted-foreground">Presets:</span>
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
                  "inline-flex min-h-[32px] cursor-pointer select-none items-center justify-center rounded-md border px-3 py-1 font-mono text-xs transition-all duration-150 active:scale-95",
                  isSelected
                    ? "border-brand bg-brand font-semibold text-brand-foreground shadow-xs"
                    : "border-border bg-muted/60 text-muted-foreground hover:border-brand/40 hover:bg-muted",
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

export function AcknowledgementsField({ disabled }: { disabled: boolean }) {
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
          I confirm that these quiz settings are correct and I have reviewed the
          content for accuracy.
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

export function SubmitSection({ isSubmitting }: { isSubmitting: boolean }) {
  const { control, formState } = useFormContext<QuizCreateFormValues>();
  const title = (useWatch({ control, name: "title" }) as string) ?? "";
  const isSubmitDisabled =
    isSubmitting || (!formState.isDirty && !title.trim());

  return (
    <div className="space-y-3 pt-2">
      <Button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full cursor-pointer gap-2 font-semibold shadow-xs"
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
        <p className="text-center text-xs text-muted-foreground">
          You have unsaved changes in this form.
        </p>
      )}
    </div>
  );
}
