'use client';

/**
 * `<DifficultySelect />` — three-option enum select for quiz difficulty.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.B4.
 *
 * ## What this atom owns
 *
 *   - **`<Select>` composition** with `useController` registration via
 *     `FormProvider`. Uses the shadcn `Select` primitive under
 *     `src/components/ui/Select.tsx`.
 *   - **Three-option enum** — `easy`, `medium`, `hard`. The set is
 *     derived from the generated
 *     `CreateInitialQuizVersionDtoDifficulty` constant so the enum
 *     stays in lockstep with the backend's `@pattern` / enum
 *     annotation.
 *   - **Out-of-range fallback** — when the incoming `defaultValue` is
 *     anything other than `easy | medium | hard` (e.g. `undefined`
 *     from a stale entity), the atom writes `'medium'` back to the
 *     form on mount and surfaces a "Difficulty reset to medium —
 *     invalid value" banner per master plan line 265.
 *   - **Zod-error surfacing** — when `formState.errors[name]` is
 *     non-empty, the atom renders the message below the trigger.
 *
 * ## Type-system contract
 *
 * Same as the rest of the form-atom family.
 */

import * as React from 'react';
import {
  useController,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { z } from 'zod';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';
import { CreateInitialQuizVersionDtoDifficulty } from '@/lib/api/generated/schemas/createInitialQuizVersionDtoDifficulty';

export interface DifficultySelectProps<
  T extends z.ZodType<FieldValues, any, any>
> {
  name: Path<z.infer<T>>;
  label: string;
  description?: string;
  /** Force-disable regardless of the form's submitting state. */
  disabled?: boolean;
  /** Optional className appended to the wrapping `<div>`. */
  className?: string;
}

/** Difficulty enum values in the order rendered by the `<Select>`. */
const DIFFICULTY_VALUES = [
  CreateInitialQuizVersionDtoDifficulty.easy,
  CreateInitialQuizVersionDtoDifficulty.medium,
  CreateInitialQuizVersionDtoDifficulty.hard,
] as const;

/** Documented fallback value for out-of-range incoming defaults. */
const DIFFICULTY_FALLBACK = CreateInitialQuizVersionDtoDifficulty.medium;

/** Copy shown when the atom resets the form to the fallback value. */
const DIFFICULTY_INVALID_COPY = `Difficulty reset to ${DIFFICULTY_FALLBACK} — invalid value.`;

function isValidDifficulty(value: unknown): value is typeof DIFFICULTY_VALUES[number] {
  return (
    typeof value === 'string' &&
    DIFFICULTY_VALUES.includes(value as typeof DIFFICULTY_VALUES[number])
  );
}

/**
 * `<DifficultySelect />` — three-option difficulty enum select that
 * falls through to `'medium'` on out-of-range defaults.
 */
export function DifficultySelect<
  T extends z.ZodType<FieldValues, any, any>
>(props: DifficultySelectProps<T>): React.ReactElement {
  const { name, label, description, disabled, className } = props;

  const { field, fieldState, formState } = useController({ name });
  const [showFallbackBanner, setShowFallbackBanner] = React.useState(false);

  // On first render, if the field's value is not a documented enum
  // value, write `medium` back to the form state and surface the
  // banner. The check is wrapped in a ref so it runs once per mount
  // (not on every render).
  const initialCheckRanRef = React.useRef(false);
  React.useEffect(() => {
    if (initialCheckRanRef.current) return;
    initialCheckRanRef.current = true;
    if (!isValidDifficulty(field.value)) {
      field.onChange(DIFFICULTY_FALLBACK);
      setShowFallbackBanner(true);
    }
  }, [field]);

  const selectDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  const errorMessage = fieldState.error?.message;
  const inputId = React.useId();

  return (
    <div className={cn('space-y-2', className)} data-testid={`difficulty-select-${name}`}>
      <Label htmlFor={inputId}>{label}</Label>
      {description ? (
        <p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
      <Select
        value={isValidDifficulty(field.value) ? field.value : DIFFICULTY_FALLBACK}
        onValueChange={(next) => {
          if (typeof next === 'string') {
            field.onChange(next);
          }
        }}
        disabled={selectDisabled}
        name={field.name}
      >
        <SelectTrigger id={inputId} data-testid={`difficulty-select-trigger-${name}`}>
          <SelectValue placeholder='Select difficulty' />
        </SelectTrigger>
        <SelectContent>
          {DIFFICULTY_VALUES.map((option) => (
            <SelectItem key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showFallbackBanner ? (
        <p
          className='text-xs text-warning'
          role='status'
          aria-live='polite'
          data-testid={`difficulty-select-fallback-banner-${name}`}
        >
          {DIFFICULTY_INVALID_COPY}
        </p>
      ) : null}
      {errorMessage ? (
        <p className='text-xs text-destructive' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}