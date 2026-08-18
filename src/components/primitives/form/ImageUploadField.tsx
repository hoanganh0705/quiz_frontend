'use client';

import * as React from 'react';
import {
  useController,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { z } from 'zod';
import { X, Loader2 } from 'lucide-react';

import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';
import { useUpload } from '@/features/uploads/hooks/useUpload';
import {
  deriveUrlClient,
  type UploadPurpose,
} from '@/lib/storage/public-id-pattern';

/**
 * Migration note (Phase 7 — migrate-on-write).
 *
 * The form field this component is bound to **always** holds a
 * `publicId` (the new Cloudinary column) after the Cloudinary
 * migration. The legacy Base64 data URL column is still rendered by
 * the backend through a fallback in `UserResponseMapper` /
 * `QuizResponseMapper`, but it never enters this code path: the
 * field is `null` until the user picks a new file, and the user
 * picking a new file writes a `publicId` directly.
 *
 * If the surrounding page renders a pre-Cloudinary avatar (e.g. an
 * existing user who has never uploaded through the new flow), the
 * page-level `<Avatar>` component is responsible for the legacy
 * `data:image/...` fallback — this component does not need to
 * understand it.
 */
export interface ImageUploadFieldProps<
  T extends z.ZodTypeAny
> {
  name: Path<z.infer<T>>;
  label: string;
  description?: string;
  purpose: UploadPurpose;

  /**
   * Client-side pre-upload size cap. Surfaces a "Reduce file size"
   * warning *before* the upload starts; the backend is the source of
   * truth and will reject with 413 anyway.
   */
  maxBytes?: number;

  disabled?: boolean;

  className?: string;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function isPublicIdShape(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function ImageUploadField<
  T extends z.ZodTypeAny
>(props: ImageUploadFieldProps<T>): React.ReactElement {
  const {
    name,
    label,
    description,
    purpose,
    maxBytes = DEFAULT_MAX_BYTES,
    disabled,
    className,
  } = props;

  const { field, fieldState, formState } = useController({ name });
  const [oversize, setOversize] = React.useState<{
    fileName: string;
    fileSize: number;
  } | null>(null);

  const { upload, isUploading, progress, error, retry } = useUpload();

  const inputDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  const value = typeof field.value === 'string' ? field.value : '';
  const errorMessage = fieldState.error?.message;
  const inputId = React.useId();

  const handleFile = React.useCallback(
    async (file: File | undefined): Promise<void> => {
      if (!file) {
        setOversize(null);
        return;
      }
      if (file.size > maxBytes) {
        setOversize({ fileName: file.name, fileSize: file.size });
        return;
      }
      setOversize(null);
      try {
        const result = await upload({ file, purpose });
        field.onChange(result.publicId);
      } catch {
        // Error is surfaced via `useUpload`'s `error` state and will
        // render below. Do not write `field.value` on failure.
      }
    },
    [field, maxBytes, purpose, upload],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    void handleFile(file ?? undefined);
  }

  function handleRemove(): void {
    field.onChange('');
    setOversize(null);
  }

  const previewUrl = isPublicIdShape(value) ? deriveUrlClient(value, purpose) : null;

  return (
    <div className={cn('space-y-2', className)} data-testid={`image-upload-field-${name}`}>
      <Label htmlFor={inputId}>{label}</Label>
      {description ? (
        <p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}

      {previewUrl ? (
        <div
          className='relative inline-block rounded-md border bg-muted p-2'
          data-testid={`image-upload-field-preview-${name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
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
          disabled={inputDisabled || isUploading}
          onChange={handleChange}
          className='block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80 disabled:opacity-50'
          data-testid={`image-upload-field-input-${name}`}
        />
      )}

      {isUploading ? (
        <div
          className='flex items-center gap-2 text-xs text-muted-foreground'
          role='status'
          aria-live='polite'
          data-testid={`image-upload-field-progress-${name}`}
        >
          <Loader2 className='h-3 w-3 animate-spin' aria-hidden='true' />
          <span>Uploading… {progress === null ? '' : `${progress}%`}</span>
        </div>
      ) : null}

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

      {error && !isUploading ? (
        <div
          className='flex items-center gap-2 text-xs text-destructive'
          role='alert'
          data-testid={`image-upload-field-error-${name}`}
        >
          <span>Upload failed: {error.message}</span>
          <button
            type='button'
            onClick={() => {
              void retry();
            }}
            className='rounded border border-destructive/40 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-destructive/10'
          >
            Retry
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <p className='text-xs text-destructive' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
