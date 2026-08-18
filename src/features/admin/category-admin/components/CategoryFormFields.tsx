'use client';

import { useCallback, useEffect, useId, useState } from 'react';

import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/shared/utils/merge-class-names';

import { deriveCategorySlug } from '../category-slug-regex';
import {
CATEGORY_DESCRIPTION_MAX_LENGTH,
CATEGORY_IMAGE_URL_MAX_LENGTH,
CATEGORY_NAME_MAX_LENGTH,
CATEGORY_NAME_MIN_LENGTH,
CATEGORY_SLUG_MAX_LENGTH,
validateCategoryImageUrl,
validateCategoryName,
} from '../category-validation';
import {
useCategorySlugAvailability,
type SlugAvailabilityStatus,
} from '../hooks/useCategorySlugAvailability';

export interface CategoryFormState {
name: string;
slug: string;
description: string;
imageUrl: string;
}

export interface CategoryFormFieldsProps {

mode: 'create' | 'edit';

initialName?: string;

initialSlug?: string;

initialDescription?: string;

initialImageUrl?: string | null;

excludeCategoryId?: string;

onChange?: (state: CategoryFormState) => void;

disabled?: boolean;
className?: string;
}

function AvailabilityIcon({ status }: { status: SlugAvailabilityStatus }) {
if (status === 'available') {
return (
<CheckCircle
className='h-4 w-4 text-green-500 shrink-0'
aria-label='Slug is available'
      />
    );
  }
if (status === 'taken') {
return (
<AlertCircle
className='h-4 w-4 text-yellow-500 shrink-0'
aria-label='Slug is taken'
      />
    );
  }
return (
<HelpCircle
className='h-4 w-4 text-muted-foreground shrink-0'
aria-label='Checking slug availability'
    />
  );
}

function AvailabilityLabel({
status,
conflictingCategoryName,
}: {
status: SlugAvailabilityStatus;
conflictingCategoryName?: string;
}) {
if (status === 'available') {
return (
<span className='text-xs text-green-600 dark:text-green-400'>
Slug is available
      </span>
    );
  }
if (status === 'taken') {
const name = conflictingCategoryName
? ` (taken by "${conflictingCategoryName}")`
: '';
return (
<span className='text-xs text-yellow-600 dark:text-yellow-400'>
Slug is taken{name}
</span>
    );
  }
if (status === 'invalid') {
return (
<span className='text-xs text-red-500'>
Slug must be lowercase letters, numbers, and hyphens only
      </span>
    );
  }
return null;
}

export function CategoryFormFields({
mode,
initialName = '',
initialSlug = '',
initialDescription = '',
initialImageUrl = '',
excludeCategoryId,
onChange,
disabled = false,
className,
}: CategoryFormFieldsProps) {
const nameId = useId();
const slugId = useId();
const descriptionId = useId();
const imageUrlId = useId();

const [name, setName] = useState(initialName);
const [slug, setSlug] = useState(initialSlug);
const [description, setDescription] = useState(initialDescription);
const [imageUrl, setImageUrl] = useState(initialImageUrl ?? '');
const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

useEffect(() => {
setName(initialName);
setSlug(initialSlug);
setDescription(initialDescription);
setImageUrl(initialImageUrl ?? '');
setSlugManuallyEdited(false);

  }, [initialName, initialSlug, initialDescription, initialImageUrl]);

const { status: availabilityStatus, conflictingCategory } =
useCategorySlugAvailability(slug, excludeCategoryId);

useEffect(() => {
if (mode === 'create' && !slugManuallyEdited && name) {
const derived = deriveCategorySlug(name);
setSlug(derived);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, mode]);

const emitChange = useCallback(
(
nextName: string,
nextSlug: string,
nextDescription: string,
nextImageUrl: string,
    ) => {
onChange?.({
name: nextName,
slug: nextSlug,
description: nextDescription,
imageUrl: nextImageUrl,
      });
    },
[onChange],
  );

const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
setName(val);
emitChange(val, slug, description, imageUrl);
  };

const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
setSlug(val);
setSlugManuallyEdited(true);
emitChange(name, val, description, imageUrl);
  };

const handleDescriptionChange = (
e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
const val = e.target.value;
setDescription(val);
emitChange(name, slug, val, imageUrl);
  };

const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
setImageUrl(val);
emitChange(name, slug, description, val);
  };

const nameValidation = validateCategoryName(name);
const nameError = !nameValidation.ok
? nameValidation.reason === 'empty'
? `Name must be at least ${CATEGORY_NAME_MIN_LENGTH} character`
: `Name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`
: null;

const slugInvalid =
slug.length > 0 && availabilityStatus === 'invalid';

const imageUrlValidation = validateCategoryImageUrl(
imageUrl.trim().length === 0 ? null : imageUrl,
  );
const imageUrlError = !imageUrlValidation.ok
? imageUrlValidation.reason === 'too-long'
? `Image URL must be ${CATEGORY_IMAGE_URL_MAX_LENGTH} characters or fewer`
: 'Image URL must be a valid http(s) URL'
: null;

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
maxLength={CATEGORY_NAME_MAX_LENGTH}
minLength={CATEGORY_NAME_MIN_LENGTH}
aria-required='true'
aria-invalid={!!nameError}
aria-describedby={nameError ? `${nameId}-error` : undefined}
placeholder={
mode === 'create' ? 'e.g. Mathematics' : 'Category name'
          }
className={cn(
nameError &&
'border-destructive focus-visible:border-destructive',
          )}
        />
{nameError && (
<p
id={`${nameId}-error`}
className='text-xs text-destructive'
role='alert'
          >
{nameError}
</p>
        )}
<p className='text-xs text-muted-foreground'>
{name.length}/{CATEGORY_NAME_MAX_LENGTH} characters
        </p>
</div>

{/* Slug */}
<div className='space-y-2'>
<div className='flex items-center justify-between'>
<Label htmlFor={slugId}>
Slug{' '}
<span className='text-muted-foreground font-normal'>
(optional)
            </span>
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
maxLength={CATEGORY_SLUG_MAX_LENGTH}
aria-describedby={`${slugId}-hint ${slugId}-availability`}
aria-invalid={slugInvalid}
placeholder={
mode === 'create'
? 'auto-generated from name'
: 'e.g. mathematics'
            }
className={cn(
slugInvalid &&
'border-destructive focus-visible:border-destructive',
'pr-10',
            )}
          />
<div className='absolute right-3 top-1/2 -translate-y-1/2'>
<AvailabilityIcon status={availabilityStatus} />
</div>
</div>

<AvailabilityLabel
status={availabilityStatus}
conflictingCategoryName={conflictingCategory?.name}
        />

<p id={`${slugId}-hint`} className='text-xs text-muted-foreground'>
{mode === 'create' && !slugManuallyEdited
? 'Auto-generated from name. Edit to customise.'
: `${slug.length}/${CATEGORY_SLUG_MAX_LENGTH} characters`}
</p>
</div>

{/* Description (A1 documented) */}
<div className='space-y-2'>
<Label htmlFor={descriptionId}>
Description{' '}
<span className='text-muted-foreground font-normal'>
(optional)
          </span>
</Label>
<Textarea
id={descriptionId}
value={description}
onChange={handleDescriptionChange}
disabled={disabled}
maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
placeholder='A short summary of this category.'
rows={3}
aria-describedby={`${descriptionId}-hint`}
        />
<p
id={`${descriptionId}-hint`}
className='text-xs text-muted-foreground'
        >
{description.length}/{CATEGORY_DESCRIPTION_MAX_LENGTH} characters
        </p>
</div>

{/* Image URL (A1 documented) */}
<div className='space-y-2'>
<Label htmlFor={imageUrlId}>
Image URL{' '}
<span className='text-muted-foreground font-normal'>
(optional)
          </span>
</Label>
<Input
id={imageUrlId}
type='url'
value={imageUrl}
onChange={handleImageUrlChange}
disabled={disabled}
maxLength={CATEGORY_IMAGE_URL_MAX_LENGTH}
aria-invalid={!!imageUrlError}
aria-describedby={
imageUrlError ? `${imageUrlId}-error` : `${imageUrlId}-hint`
          }
placeholder='https://example.com/cover.png'
className={cn(
imageUrlError &&
'border-destructive focus-visible:border-destructive',
          )}
        />
{imageUrlError ? (
<p
id={`${imageUrlId}-error`}
className='text-xs text-destructive'
role='alert'
          >
{imageUrlError}
</p>
        ) : (
<p
id={`${imageUrlId}-hint`}
className='text-xs text-muted-foreground'
          >
{imageUrl.length}/{CATEGORY_IMAGE_URL_MAX_LENGTH} characters
          </p>
        )}
</div>
</div>
  );
}