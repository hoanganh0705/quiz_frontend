'use client';

/**
 * `QuizSlugField` — slug text input with debounced live-availability check
 * and auto-derivation preview.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-C1.
 *
 * ## What this component owns
 *
 *   - **Text input** for manual slug entry with `TAG_SLUG_REGEX` pattern
 *     validation (inline zod error).
 *   - **Availability indicator** — shows checking spinner, green checkmark
 *     (available), or red X (taken) after the 400 ms debounce window.
 *   - **Auto-derivation preview** — when the slug field is blank, a preview
 *     of the auto-derived slug (from `titleValue`) is shown beneath
 *     the input.
 *   - **`useController` registration** — auto-registers with the
 *     surrounding `FormProvider` via the `name` prop.
 *
 * ## What this component does NOT own
 *
 *   - **Slug auto-derivation algorithm.** The backend derives the slug from
 *     the title. The preview uses a client-side approximation that matches
 *     the backend: lowercase, spaces → hyphens, strip non-alphanumeric
 *     characters, trim leading/trailing hyphens.
 *   - **Submit handler.** The parent form calls `useQuizForm.submit()`.
 *   - **Form-level error surfacing.** `409 QUIZ_SLUG_CONFLICT` from the
 *     submit handler surfaces via `<FormErrorBanner />`, not here.
 *
 * ## Design decisions
 *
 * The availability check uses `GET /quizzes/:slug` — a 404 means the slug
 * is available; any other status means it is taken. This avoids a dedicated
 * "check slug" endpoint.
 */

import * as React from 'react';
import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import type { z } from 'zod';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';
import { useCheckQuizSlug } from '@/features/quizzes/hooks/useCheckQuizSlug';
import { TAG_SLUG_INVALID_COPY } from '@/lib/forms/regex';

// ─── Slug derivation ───────────────────────────────────────────────────────

/**
 * Client-side approximation of the backend's slug auto-derivation.
 *
 * Matches the backend's algorithm:
 *   1. Lowercase the input.
 *   2. Replace spaces with hyphens.
 *   3. Remove any character that is not alphanumeric or a hyphen.
 *   4. Trim leading/trailing hyphens.
 *   5. Collapse multiple consecutive hyphens into one.
 */
function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // strip invalid chars
    .replace(/-+/g, '-')         // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');   // trim ends
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface QuizSlugFieldProps<
  T extends z.ZodType<FieldValues, any, any>
> {
  /**
   * Dot-path of the slug field in the form schema.
   * Type-narrowed via `FieldPath<z.infer<T>>` so typos are compile errors.
   */
  name: FieldPath<z.infer<T>>;
  /** Visible label for the slug input. */
  label?: string;
  /** Current title value — used to show the auto-derivation preview. */
  titleValue: string;
  /** Help text shown below the label. */
  description?: string;
  /** Placeholder text. */
  placeholder?: string;
  /** Force-disable regardless of the form's submitting state. */
  disabled?: boolean;
  /** Extra className for the wrapping div. */
  className?: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Checking…
      </span>
    );
  }

  if (available === true) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
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
        {error ?? 'Taken'}
      </span>
    );
  }

  return null;
}

// ─── Root component ─────────────────────────────────────────────────────────

/**
 * `<QuizSlugField name titleValue label? description? />` —
 * slug input with live-availability check and auto-derivation preview.
 *
 * Renders inside a `FormProvider` (created by `useQuizForm().form`).
 */
export function QuizSlugField<
  T extends z.ZodType<FieldValues, any, any>,
>({
  name,
  label = 'URL Slug',
  titleValue,
  description,
  placeholder = 'my-quiz-slug',
  disabled,
  className,
}: QuizSlugFieldProps<T>): React.ReactElement {
  const { control, formState } = useFormContext<z.infer<T>>();
  const { available, isChecking, error, check, reset } = useCheckQuizSlug();

  const inputDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slugValue = React.useRef<string>('');

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      ) : null}

      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Controller
          name={name}
          control={control}
          render={({ field, fieldState }) => {
            // Track the raw field value for debounce triggering.
            const currentValue = (field.value as string | null | undefined) ?? '';
            if (currentValue !== slugValue.current) {
              slugValue.current = currentValue;
              if (currentValue.trim() !== '') {
                check(currentValue.trim());
              } else {
                reset();
              }
            }

            return (
              <input
                id={`slug-${name}`}
                type="text"
                placeholder={placeholder}
                disabled={inputDisabled}
                value={field.value ?? ''}
                onChange={(e) => {
                  field.onChange(e);
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={!!fieldState.error?.message}
                className={cn(
                  'flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm',
                  'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  fieldState.error?.message
                    ? 'border-destructive focus-visible:ring-destructive/20'
                    : 'border-input',
                )}
              />
            );
          }}
        />

        <AvailabilityIndicator
          available={available}
          isChecking={isChecking}
          error={error}
        />
      </div>

      {/* Auto-derivation preview — shown when slug is blank and title is non-empty */}
      {deriveSlug(titleValue).length > 0 && slugValue.current.trim() === '' && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Auto-generated:{' '}
          <span className="font-mono text-muted-foreground/70">
            {deriveSlug(titleValue)}
          </span>
        </p>
      )}

      {/* Zod error */}
      {(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Controller2 = Controller as any;
      return (
        <Controller2
          name={name}
          control={control}
          render={({ fieldState }: { fieldState: { error?: { message?: string } } }) =>
            fieldState.error?.message ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message === TAG_SLUG_INVALID_COPY
                  ? TAG_SLUG_INVALID_COPY
                  : fieldState.error.message}
              </p>
            ) : null
          }
        />
      );
      })()}
    </div>
  );
}
