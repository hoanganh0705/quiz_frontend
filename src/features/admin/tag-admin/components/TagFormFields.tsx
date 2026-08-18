'use client';

import { useCallback, useEffect, useId, useState } from 'react';

import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

import { deriveTagSlug } from '../tag-slug-regex';
import {
TAG_NAME_MAX_LENGTH,
TAG_NAME_MIN_LENGTH,
TAG_SLUG_MAX_LENGTH,
} from '../tag-validation';
import {
useTagSlugAvailability,
type SlugAvailabilityStatus,
} from '../hooks/useTagSlugAvailability';

export interface TagFormFieldsProps {

mode: 'create' | 'edit';

initialName?: string;

initialSlug?: string;

excludeTagId?: string;

onChange?: (state: { name: string; slug: string }) => void;

disabled?: boolean;
className?: string;
}

function AvailabilityIcon({ status }: { status: SlugAvailabilityStatus }) {
if (status === 'available') {
return <CheckCircle className='h-4 w-4 text-green-500 shrink-0' aria-label='Slug is available' />;
  }
if (status === 'taken') {
return <AlertCircle className='h-4 w-4 text-yellow-500 shrink-0' aria-label='Slug is taken' />;
  }
return <HelpCircle className='h-4 w-4 text-muted-foreground shrink-0' aria-label='Checking slug availability' />;
}

function AvailabilityLabel({ status, conflictingTagName }: {
status: SlugAvailabilityStatus;
conflictingTagName?: string;
}) {
if (status === 'available') {
return <span className='text-xs text-green-600 dark:text-green-400'>Slug is available</span>;
  }
if (status === 'taken') {
const name = conflictingTagName ? ` (taken by "${conflictingTagName}")` : '';
return (
<span className='text-xs text-yellow-600 dark:text-yellow-400'>
Slug is taken{name}
</span>
    );
  }
if (status === 'invalid') {
return <span className='text-xs text-red-500'>Slug must be lowercase letters, numbers, and hyphens only</span>;
  }
return null;
}

export function TagFormFields({
mode,
initialName = '',
initialSlug = '',
excludeTagId,
onChange,
disabled = false,
className,
}: TagFormFieldsProps) {
const nameId = useId();
const slugId = useId();

const [name, setName] = useState(initialName);
const [slug, setSlug] = useState(initialSlug);
const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

useEffect(() => {
setName(initialName);
setSlug(initialSlug);
setSlugManuallyEdited(false);

  }, [initialName, initialSlug]);

const { status: availabilityStatus, conflictingTag } = useTagSlugAvailability(
slug,
excludeTagId,
  );

useEffect(() => {
if (mode === 'create' && !slugManuallyEdited && name) {
const derived = deriveTagSlug(name);
setSlug(derived);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, mode]);

const emitChange = useCallback(
(n: string, s: string) => {
onChange?.({ name: n, slug: s });
    },
[onChange],
  );

const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
setName(val);
emitChange(val, slug);
  };

const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
setSlug(val);
setSlugManuallyEdited(true);
emitChange(name, val);
  };

const nameError =
name.length > TAG_NAME_MAX_LENGTH
? `Name must be ${TAG_NAME_MAX_LENGTH} characters or fewer`
: name.trim().length < TAG_NAME_MIN_LENGTH && name.length > 0
? `Name must be at least ${TAG_NAME_MIN_LENGTH} character`
: null;

const slugInvalid =
slug.length > 0 && availabilityStatus === 'invalid';

return (
<div className={cn('space-y-4', className)}>
{/* Name */}
<div className='space-y-2'>
<Label htmlFor={nameId}>
Name <span className='text-destructive' aria-hidden>*</span>
</Label>
<Input
id={nameId}
type='text'
value={name}
onChange={handleNameChange}
disabled={disabled}
maxLength={TAG_NAME_MAX_LENGTH}
minLength={TAG_NAME_MIN_LENGTH}
aria-required='true'
aria-invalid={!!nameError}
aria-describedby={nameError ? `${nameId}-error` : undefined}
placeholder={mode === 'create' ? 'e.g. JavaScript Basics' : ''}
className={cn(nameError && 'border-destructive focus-visible:border-destructive')}
        />
{nameError && (
<p id={`${nameId}-error`} className='text-xs text-destructive' role='alert'>
{nameError}
</p>
        )}
<p className='text-xs text-muted-foreground'>
{name.length}/{TAG_NAME_MAX_LENGTH} characters
        </p>
</div>

{/* Slug */}
<div className='space-y-2'>
<div className='flex items-center justify-between'>
<Label htmlFor={slugId}>
Slug <span className='text-muted-foreground font-normal'>(optional)</span>
</Label>
{/* Regex preview chip */}
<span
className='text-xs text-muted-foreground font-mono'
aria-label='Slug pattern: lowercase letters, numbers, hyphens'
          >
a-z 0-9 -
          </span>
</div>

<div className='relative'>
<Input
id={slugId}
type='text'
value={slug}
onChange={handleSlugChange}
disabled={disabled}
maxLength={TAG_SLUG_MAX_LENGTH}
aria-describedby={`${slugId}-hint ${slugId}-availability`}
aria-invalid={slugInvalid}
placeholder={mode === 'create' ? 'auto-generated from name' : 'e.g. javascript-basics'}
className={cn(
slugInvalid && 'border-destructive focus-visible:border-destructive',
'pr-10',
            )}
          />
<div className='absolute right-3 top-1/2 -translate-y-1/2'>
<AvailabilityIcon status={availabilityStatus} />
</div>
</div>

<AvailabilityLabel
status={availabilityStatus}
conflictingTagName={conflictingTag?.name}
        />

<p id={`${slugId}-hint`} className='text-xs text-muted-foreground'>
{mode === 'create' && !slugManuallyEdited
? 'Auto-generated from name. Edit to customise.'
: `${slug.length}/${TAG_SLUG_MAX_LENGTH} characters`}
</p>
</div>
</div>
  );
}
