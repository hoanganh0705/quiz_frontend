"use client";

import * as React from "react";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  Controller,
  useFormContext,
  useWatch,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { useCheckQuizSlug } from "@/features/quizzes/hooks/useCheckQuizSlug";

import { cn } from "@/shared/utils/merge-class-names";

import type { z } from "zod";

function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/[^a-z0-9-]/g, "") // strip invalid chars
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim ends
}

export interface QuizSlugFieldProps<T extends z.ZodType<FieldValues>> {
  name: FieldPath<z.infer<T>>;

  label?: string;

  titleValue?: string;

  description?: string;

  placeholder?: string;

  disabled?: boolean;

  className?: string;
}

function AvailabilityIndicator({
  available,
  isChecking,
  error,
}: {
  available: boolean | null;
  isChecking: boolean;
  error: string | null;
}) {
  if (isChecking) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Checking…
      </span>
    );
  }

  if (available === true) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-success"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Available
      </span>
    );
  }

  if (available === false) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-destructive"
        role="alert"
      >
        <XCircle className="h-3 w-3" aria-hidden="true" />
        {error ?? "Taken"}
      </span>
    );
  }

  return null;
}

export function QuizSlugField<T extends z.ZodType<FieldValues>>({
  name,
  label = "URL Slug",
  titleValue,
  description,
  placeholder = "my-quiz-slug",
  disabled,
  className,
}: QuizSlugFieldProps<T>): React.ReactElement {
  const { control, formState } = useFormContext<z.infer<T>>();
  const { available, isChecking, error, check, reset } = useCheckQuizSlug();
  const watchedTitleRaw = useWatch({
    control,
    name: "title" as FieldPath<z.infer<T>>,
  });
  const watchedSlugRaw = useWatch({ control, name });
  const watchedTitle =
    typeof watchedTitleRaw === "string" ? watchedTitleRaw : "";
  const watchedSlug = typeof watchedSlugRaw === "string" ? watchedSlugRaw : "";
  const resolvedTitle = titleValue !== undefined ? titleValue : watchedTitle;

  const inputDisabled =
    disabled === true
      ? true
      : disabled === false
        ? false
        : formState.isSubmitting;

  React.useEffect(() => {
    const trimmed = watchedSlug.trim();
    if (trimmed !== "") {
      check(trimmed);
    } else {
      reset();
    }
  }, [watchedSlug, check, reset]);

  const derivedSlug = deriveSlug(resolvedTitle);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label
          htmlFor={`slug-${name}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      ) : null}

      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <div className="flex items-center gap-2">
              <input
                id={`slug-${name}`}
                type="text"
                placeholder={placeholder}
                disabled={inputDisabled}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={Boolean(fieldState.error?.message)}
                className={cn(
                  "flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm",
                  "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  fieldState.error?.message
                    ? "border-destructive focus-visible:ring-destructive/20"
                    : "border-input",
                )}
              />

              <AvailabilityIndicator
                available={available}
                isChecking={isChecking}
                error={error}
              />
            </div>

            {derivedSlug.length > 0 && watchedSlug.trim() === "" && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Auto-generated:{" "}
                <span className="font-mono font-medium text-foreground/80">
                  {derivedSlug}
                </span>
              </p>
            )}

            {fieldState.error?.message ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
