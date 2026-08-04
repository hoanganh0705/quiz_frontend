'use client';

/**
 * `StarRatingInput` — accessible 1–5 star rating input.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.12.
 *
 * A controlled radio-group of five stars. Each star is a
 * `RadioGroupItem` with an accessible label like "3 stars".
 * Keyboard support (arrow keys / Home / End) is inherited from
 * Radix's `RadioGroup` primitive — focus moves between stars and
 * the selection updates the controlled `value`.
 *
 * ## Controlled contract
 *
 * The component emits only integers 1 through 5 (or `null` when
 * nothing is selected). It never owns the selected value — the
 * parent form (T-4.13.8 / T-4.13.9 `useCreateReview` /
 * `useEditReview`) owns the value via `react-hook-form`'s
 * `Controller` and passes `value` + `onValueChange` here.
 *
 * ## Disabled
 *
 * When `disabled` is true, every `RadioGroupItem` is disabled and
 * the `onValueChange` callback is a no-op (Radix suppresses the
 * event entirely).
 *
 * ## Error association
 *
 * `errorMessage` is rendered with `role="alert"` and linked via
 * `aria-describedby` so screen readers announce the field error
 * when the input is focused. The error does NOT alter the value
 * (T-4.13.12 AC #7) — the parent form owns validation feedback.
 *
 * @example
 * ```tsx
 * <Controller
 *   control={form.control}
 *   name="rating"
 *   render={({ field, fieldState }) => (
 *     <StarRatingInput
 *       value={field.value}
 *       onValueChange={field.onChange}
 *       disabled={form.formState.isSubmitting}
 *       errorMessage={fieldState.error?.message}
 *     />
 *   )}
 * />
 * ```
 */

import * as React from 'react';
import { Star } from 'lucide-react';

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/RadioGroup';
import { cn } from '@/shared/utils/merge-class-names';

// ─── Public types ────────────────────────────────────────────────────────────

export interface StarRatingInputProps {
  /**
   * Currently selected integer 1–5. Pass `null` for an empty
   * selection.
   */
  value: number | null;
  /**
   * Called when the viewer picks a star. The new value is always
   * an integer 1–5.
   */
  onValueChange: (value: number) => void;
  /** Disable selection. */
  disabled?: boolean;
  /** Accessible label for the group (e.g. "Your rating"). */
  ariaLabel?: string;
  /** Inline field error text. When set, the group is `aria-invalid`. */
  errorMessage?: string;
  /** Optional className for the root. */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAR_VALUES: readonly number[] = [1, 2, 3, 4, 5];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Accessible 1–5 star rating input.
 *
 * @example
 *   <StarRatingInput
 *     value={rating}
 *     onValueChange={setRating}
 *     ariaLabel='Rate this quiz'
 *   />
 */
export function StarRatingInput({
  value,
  onValueChange,
  disabled = false,
  ariaLabel = 'Rating',
  errorMessage,
  className,
}: StarRatingInputProps): React.ReactElement {
  const reactId = React.useId();
  const errorId = `${reactId}-error`;

  // Normalize `null` / `undefined` / out-of-range to an empty
  // string so Radix's `RadioGroup` treats the group as unchecked.
  // The `value` prop on Radix's `RadioGroup` expects the value of
  // the checked item (a string), or an empty string for no
  // selection.
  const normalizedValue =
    typeof value === 'number' && value >= 1 && value <= 5
      ? String(value)
      : '';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <RadioGroup
        value={normalizedValue}
        onValueChange={(next) => {
          // Defensive — Radix only emits the `value` of one of the
          // `RadioGroupItem`s, which are all integers 1–5 as
          // strings. Coerce and emit.
          const parsed = Number.parseInt(next, 10);
          if (
            Number.isInteger(parsed) &&
            parsed >= 1 &&
            parsed <= 5
          ) {
            onValueChange(parsed);
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        className='flex items-center gap-1'
      >
        {STAR_VALUES.map((starValue) => {
          const isSelected =
            typeof value === 'number' && value >= starValue;
          return (
            <RadioGroupItem
              key={starValue}
              value={String(starValue)}
              aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
              className={cn(
                'size-9 border-0 p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <Star
                aria-hidden='true'
                className={cn(
                  'size-6 transition-colors',
                  isSelected
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-muted-foreground',
                )}
              />
            </RadioGroupItem>
          );
        })}
      </RadioGroup>
      {errorMessage ? (
        <p
          id={errorId}
          role='alert'
          className='text-sm text-destructive'
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
