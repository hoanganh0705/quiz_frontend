'use client';

import * as React from 'react';
import {
useController,
type FieldValues,
type Path,
} from 'react-hook-form';
import type { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

export interface RichTextAreaProps<T extends z.ZodType<FieldValues, any, any>> {
name: Path<z.infer<T>>;
label: string;
description?: string;
placeholder?: string;

maxLength?: number;

previewLabel?: string;

disabled?: boolean;

className?: string;

testId?: string;
}

export function RichTextArea<T extends z.ZodType<FieldValues, any, any>>(
props: RichTextAreaProps<T>
): React.ReactElement {
const {
name,
label,
description,
placeholder,
maxLength,
previewLabel,
disabled,
className,
testId,
  } = props;

const { field, fieldState, formState } = useController({ name });
const [showPreview, setShowPreview] = React.useState(false);

const inputDisabled =
disabled === true ? true : disabled === false ? false : formState.isSubmitting;

const errorMessage = fieldState.error?.message;
const currentLength = String(field.value ?? '').length;
const inputId = React.useId();

return (
<div className={cn('space-y-2', className)} data-testid={`rich-text-area-${name}`}>
<div className='flex items-center justify-between'>
<Label htmlFor={inputId}>{label}</Label>
{previewLabel ? (
<button
type='button'
onClick={() => setShowPreview((v) => !v)}
className='text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1'
aria-pressed={showPreview}
data-testid={`rich-text-area-preview-toggle-${name}`}
          >
{showPreview ? (
<>
<EyeOff className='h-3 w-3' aria-hidden='true' /> Hide preview
              </>
            ) : (
<>
<Eye className='h-3 w-3' aria-hidden='true' /> {previewLabel}
</>
            )}
</button>
        ) : null}
</div>
{description ? (
<p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
{showPreview ? (
<div
className='min-h-16 rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap'
data-testid={`rich-text-area-preview-${name}`}
        >
{String(field.value ?? '')}
</div>
      ) : (
<Textarea
id={inputId}
placeholder={placeholder}
disabled={inputDisabled}
maxLength={maxLength}
value={String(field.value ?? '')}
onChange={(event) => field.onChange(event)}
onBlur={field.onBlur}
ref={field.ref}
aria-invalid={!!errorMessage}
data-testid={testId}
        />
      )}
<div className='flex items-center justify-between'>
{errorMessage ? (
<p className='text-xs text-destructive' role='alert'>
{errorMessage}
</p>
        ) : (
<span />
        )}
{maxLength ? (
<span
className={cn(
'text-xs',
currentLength >= maxLength
? 'text-destructive'
: 'text-muted-foreground'
            )}
data-testid={`rich-text-area-counter-${name}`}
          >
{currentLength}/{maxLength}
</span>
        ) : null}
</div>
</div>
  );
}