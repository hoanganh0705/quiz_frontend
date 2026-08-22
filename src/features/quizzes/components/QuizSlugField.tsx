'use client';

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

function deriveSlug(title: string): string {
return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // strip invalid chars
    .replace(/-+/g, '-')         // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');   // trim ends
}

export interface QuizSlugFieldProps<
T extends z.ZodType<FieldValues, any, any>
> {

name: FieldPath<z.infer<T>>;

label?: string;

titleValue: string;

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
<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
Checking…
      </span>
    );
  }

if (available === true) {
return (
<span
className="inline-flex items-center gap-1 text-xs text-success dark:text-green-400"
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
