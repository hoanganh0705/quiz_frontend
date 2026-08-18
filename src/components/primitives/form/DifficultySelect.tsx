'use client';

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

disabled?: boolean;

className?: string;
}

const DIFFICULTY_VALUES = [
CreateInitialQuizVersionDtoDifficulty.easy,
CreateInitialQuizVersionDtoDifficulty.medium,
CreateInitialQuizVersionDtoDifficulty.hard,
] as const;

const DIFFICULTY_FALLBACK = CreateInitialQuizVersionDtoDifficulty.medium;

const DIFFICULTY_INVALID_COPY = `Difficulty reset to ${DIFFICULTY_FALLBACK} — invalid value.`;

function isValidDifficulty(value: unknown): value is typeof DIFFICULTY_VALUES[number] {
return (
typeof value === 'string' &&
DIFFICULTY_VALUES.includes(value as typeof DIFFICULTY_VALUES[number])
  );
}

export function DifficultySelect<
T extends z.ZodType<FieldValues, any, any>
>(props: DifficultySelectProps<T>): React.ReactElement {
const { name, label, description, disabled, className } = props;

const { field, fieldState, formState } = useController({ name });
const [showFallbackBanner, setShowFallbackBanner] = React.useState(false);

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