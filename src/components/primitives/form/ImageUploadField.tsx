'use client';

/**
 * `<ImageUploadField />` — image-upload atom with 5 MB client-side cap.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.B6.
 *
 * ## What this atom owns
 *
 *   - **5 MB client-side cap** — oversize files are blocked with an
 *     inline "Reduce file size — maximum 5 MB" message (master plan
 *     line 276). `maxBytes` is parameterised; the default is
 *     `5 * 1024 * 1024`.
 *   - **`<input type="file" accept="image/*">`** for native file
 *     selection.
 *   - **Data-URL storage** — the atom reads the file as a data URL via
 *     `FileReader.readAsDataURL` and writes the data URL to the form
 *     value. The form value type is `string` (data URL), matching the
 *     generated `CreateQuizDto.imageUrl: string | null` shape.
 *   - **Thumbnail preview** — when a value is present, a thumbnail is
 *     rendered with a "Remove image" button that clears the form
 *     value.
 *   - **`useController` registration** — the atom does NOT take a
 *     `register` prop; it pulls the field's value / onChange from
 *     `useFormContext()`.
 *
 * ## What this atom does NOT own
 *
 *   - **Pre-signed URL upload** — the data URL is committed to the
 *     form, but the parent form's submit handler (TKT-4.2.A3) is
 *     responsible for either posting the data URL or swapping it for
 *     a pre-signed URL before the SDK call. The atom does not know
 *     which path the consumer picks.
 *   - **Image cropping / resizing** — out of scope for the primitive;
 *     cropping is a separate concern and may be added as a sibling
 *     primitive later.
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
import { X } from 'lucide-react';

import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

export interface ImageUploadFieldProps<
  T extends z.ZodType<FieldValues, any, any>
> {
  name: Path<z.infer<T>>;
  label: string;
  description?: string;
  /**
   * Maximum size in bytes. Defaults to 5 MB. Files strictly larger
   * than this value are rejected with an inline message.
   */
  maxBytes?: number;
  /** Force-disable regardless of the form's submitting state. */
  disabled?: boolean;
  /** Optional className appended to the wrapping `<div>`. */
  className?: string;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * `<ImageUploadField />` — image-upload atom with 5 MB client-side cap.
 */
export function ImageUploadField<
  T extends z.ZodType<FieldValues, any, any>
>(props: ImageUploadFieldProps<T>): React.ReactElement {
  const {
    name,
    label,
    description,
    maxBytes = DEFAULT_MAX_BYTES,
    disabled,
    className,
  } = props;

  const { field, fieldState, formState } = useController({ name });
  const [oversize, setOversize] = React.useState<{
    fileName: string;
    fileSize: number;
  } | null>(null);

  const inputDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  const value = typeof field.value === 'string' ? field.value : '';
  const errorMessage = fieldState.error?.message;
  const inputId = React.useId();

  const handleFile = React.useCallback(
    (file: File | undefined): void => {
      if (!file) {
        setOversize(null);
        return;
      }
      if (file.size > maxBytes) {
        setOversize({ fileName: file.name, fileSize: file.size });
        // Do NOT update the form value.
        return;
      }
      setOversize(null);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          field.onChange(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [field, maxBytes]
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    handleFile(file ?? undefined);
  }

  function handleRemove(): void {
    field.onChange('');
    setOversize(null);
  }

  return (
    <div className={cn('space-y-2', className)} data-testid={`image-upload-field-${name}`}>
      <Label htmlFor={inputId}>{label}</Label>
      {description ? (
        <p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}

      {value ? (
        <div
          className='relative inline-block rounded-md border bg-muted p-2'
          data-testid={`image-upload-field-preview-${name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className='max-h-40 max-w-xs rounded'
          />
          <button
            type='button'
            onClick={handleRemove}
            className='absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground'
            aria-label='Remove image'
            data-testid={`image-upload-field-remove-${name}`}
          >
            <X className='h-3 w-3' aria-hidden='true' />
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          type='file'
          accept='image/*'
          disabled={inputDisabled}
          onChange={handleChange}
          className='block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80 disabled:opacity-50'
          data-testid={`image-upload-field-input-${name}`}
        />
      )}

      {oversize ? (
        <p
          className='text-xs text-destructive'
          role='alert'
          data-testid={`image-upload-field-oversize-${name}`}
        >
          Reduce file size — maximum {(maxBytes / (1024 * 1024)).toFixed(0)} MB
          (selected {oversize.fileName} is {(oversize.fileSize / (1024 * 1024)).toFixed(1)} MB).
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