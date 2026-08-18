'use client';

import * as React from 'react';
import {
useController,
type FieldValues,
type Path,
} from 'react-hook-form';
import type { z } from 'zod';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';
import { TAG_SLUG_REGEX, TAG_SLUG_INVALID_COPY } from '@/lib/forms/regex';

export interface TagMultiSelectProps<
T extends z.ZodType<FieldValues, any, any>
> {
name: Path<z.infer<T>>;
label: string;
description?: string;

max?: number;
placeholder?: string;

disabled?: boolean;

className?: string;

testId?: string;
}

const DEFAULT_MAX = Infinity;

export function TagMultiSelect<
T extends z.ZodType<FieldValues, any, any>
>(props: TagMultiSelectProps<T>): React.ReactElement {
const {
name,
label,
description,
max = DEFAULT_MAX,
placeholder,
disabled,
className,
testId,
  } = props;

const { field, fieldState, formState } = useController({ name });
const value = Array.isArray(field.value)
? (field.value as string[])
: [];

const [draft, setDraft] = React.useState('');
const [invalidMessage, setInvalidMessage] = React.useState<string | null>(null);

const inputDisabled =
disabled === true ? true : disabled === false ? false : formState.isSubmitting;

const atMax = value.length >= max;

function commit(input: string): void {
const candidate = input.trim();
if (candidate.length === 0) {
setDraft('');
return;
    }
if (!TAG_SLUG_REGEX.test(candidate)) {
setInvalidMessage(TAG_SLUG_INVALID_COPY);
setDraft(candidate);
return;
    }
if (value.includes(candidate)) {

setDraft('');
setInvalidMessage(null);
return;
    }
if (value.length >= max) {
setInvalidMessage(`Maximum of ${max} tags reached.`);
setDraft(candidate);
return;
    }
field.onChange([...value, candidate]);
setDraft('');
setInvalidMessage(null);
  }

function removeTag(index: number): void {
const next = value.filter((_, i) => i !== index);
field.onChange(next);
  }

function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
if (event.key === 'Enter' || event.key === ',') {
event.preventDefault();
commit(draft);
    } else if (
event.key === 'Backspace' &&
draft.length === 0 &&
value.length > 0
    ) {

removeTag(value.length - 1);
    }
  }

function handleBlur(): void {

if (draft.length > 0) {
commit(draft);
    }
field.onBlur();
  }

const errorMessage = fieldState.error?.message;
const inputId = React.useId();

return (
<div
className={cn('space-y-2', className)}
data-testid={`tag-multi-select-${name}`}
    >
<Label htmlFor={inputId}>{label}</Label>
{description ? (
<p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}

<div
className='flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 min-h-10'
data-testid={`tag-multi-select-chips-${name}`}
      >
{value.map((tag, index) => (
<span

key={`${tag}-${index}`}
className='inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs'
data-tag-value={tag}
data-tag-index={index}
          >
<span
aria-hidden='true'
className='inline-block h-2 w-2 rounded-full bg-brand'
            />
<span>{tag}</span>
<button
type='button'
onClick={() => removeTag(index)}
aria-label={`Remove tag ${tag}`}
className='ml-1 inline-flex items-center justify-center text-muted-foreground hover:text-foreground'
data-testid={`tag-multi-select-remove-${name}-${index}`}
            >
<X className='h-3 w-3' aria-hidden='true' />
</button>
</span>
        ))}
<Input
id={inputId}
className='flex-1 min-w-[8rem] border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto'
placeholder={atMax ? `Maximum of ${max} tags reached` : placeholder ?? 'Add a tag'}
disabled={inputDisabled || atMax}
value={draft}
onChange={(event) => {
setDraft(event.target.value);
if (invalidMessage) setInvalidMessage(null);
          }}
onKeyDown={handleKeyDown}
onBlur={handleBlur}
data-testid={testId}
        />
</div>

{invalidMessage ? (
<p className='text-xs text-destructive' role='alert'>
{invalidMessage}
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