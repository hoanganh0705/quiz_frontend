'use client';

/**
 * `<TextField />` — the canonical text-input atom for Phase 4 authoring forms.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.B1.
 *
 * ## What this atom owns
 *
 *   - **`<Label>` + `<Input>` composition** rendered through the
 *     shadcn `Input` / `Label` primitives (`src/components/ui/`).
 *   - **`useController` registration** — the atom does NOT take a
 *     `register` prop; it pulls the field's value / onChange / onBlur
 *     / ref from `useFormContext()` via `useController({ name })`.
 *     This is the master-plan promise: "atoms register themselves
 *     automatically with the form context".
 *   - **Zod-error surfacing** — when the form's `formState.errors[name]`
 *     is non-empty, the atom renders `<p className="text-xs text-destructive">
 *     {error.message}</p>` below the input.
 *   - **Submitting-state disable** — when `form.formState.isSubmitting
 *     === true`, the input is disabled (unless `disabled === false`
 *     is explicitly passed; `disabled === true` always wins).
 *   - **Keyboard accessibility** — the `<Label>` `htmlFor` matches the
 *     input `id`, and the input is focusable.
 *
 * ## What this atom does NOT own
 *
 *   - **Validation logic** — zod drives validation; the atom only
 *     surfaces `formState.errors[name].message`.
 *   - **Submit orchestration** — the parent form calls
 *     `useQuizForm().submit()` (TKT-4.2.A3); the atom never calls
 *     `submit()` itself.
 *   - **Autosave / unsaved-changes guard** — those primitives are
 *     introduced by TKT-4.2.C2 and TKT-4.2.C3 respectively.
 *   - **Character counter** — the counter lives in `<RichTextArea />`
 *     (B2) for textarea shapes and is added to `<TextField />` when a
 *     counter is needed (TKT-4.2.B1 ticket deliberately defers it).
 *
 * ## Type-system contract
 *
 * The generic `T` is a `z.ZodType` so the `name` prop is constrained
 * to a valid path of the inferred form values via `Path<z.infer<T>>`.
 * This makes typos at the call site (`<TextField name="tiel" … />`)
 * a compile error rather than a runtime null reference.
 */

import * as React from 'react';
import {
  useController,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { z } from 'zod';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

export interface TextFieldProps<T extends z.ZodType<FieldValues, any, any>> {
  /**
   * Dot-path of the field in the form schema. Type-narrowed via
   * `Path<z.infer<T>>` so typos are caught at compile time.
   */
  name: Path<z.infer<T>>;
  /** Visible label rendered in the `<Label>` and used as `htmlFor`. */
  label: string;
  /** Optional help-text rendered under the label. */
  description?: string;
  /** `<input>` placeholder text. */
  placeholder?: string;
  /** HTML input type. Default `'text'`. */
  type?: 'text' | 'url' | 'email' | 'password' | 'tel' | 'search';
  /** When true, force-disable regardless of the form's submitting state. */
  disabled?: boolean;
  /** When true, mark the field as required (visual asterisk). */
  required?: boolean;
  /** Optional extra className appended to the wrapping `<div>`. */
  className?: string;
  /** Optional `data-testid` forwarded to the `<input>`. */
  testId?: string;
}

/**
 * `<TextField name label description? placeholder? type? disabled? required? />`
 *
 * Renders a `<Label>` + `<Input>` + optional description + error
 * message, all wired through `useController` against the surrounding
 * `FormProvider` (created by `useQuizForm().form`).
 */
export function TextField<T extends z.ZodType<FieldValues, any, any>>(
  props: TextFieldProps<T>
): React.ReactElement {
  const {
    name,
    label,
    description,
    placeholder,
    type = 'text',
    disabled,
    required,
    className,
    testId,
  } = props;

  const { field, fieldState, formState } = useController({ name });

  // The atom is disabled while the form is submitting, unless the
  // consumer explicitly opts out with `disabled === false`. An
  // explicit `disabled === true` always wins (overrides submitting).
  const inputDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  const errorMessage = fieldState.error?.message;
  const inputId = React.useId();

  return (
    <div className={cn('space-y-2', className)} data-testid={`text-field-${name}`}>
      <Label htmlFor={inputId}>
        {label}
        {required ? (
          <span aria-hidden='true' className='text-destructive'>
            *
          </span>
        ) : null}
      </Label>
      {description ? (
        <p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        disabled={inputDisabled}
        value={(field.value as string | undefined) ?? ''}
        onChange={(event) => {
          field.onChange(event);
        }}
        onBlur={field.onBlur}
        ref={field.ref}
        aria-invalid={!!errorMessage}
        data-testid={testId}
      />
      {errorMessage ? (
        <p className='text-xs text-destructive' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}