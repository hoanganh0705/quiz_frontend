'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

import {
RadioGroup,
RadioGroupItem,
} from '@/components/ui/RadioGroup';
import { cn } from '@/shared/utils/merge-class-names';

export interface StarRatingInputProps {

value: number | null;

onValueChange: (value: number) => void;

disabled?: boolean;

ariaLabel?: string;

errorMessage?: string;

className?: string;
}

const STAR_VALUES: readonly number[] = [1, 2, 3, 4, 5];

export function StarRatingInput({
value,
onValueChange,
disabled = false,
ariaLabel = 'Rating',
errorMessage,
className,
}: StarRatingInputProps): React.ReactElement {
const reactId = React.useId();
const errorId = `${reactId}-error`;

const normalizedValue =
typeof value === 'number' && value >= 1 && value <= 5
? String(value)
: '';

return (
<div className={cn('flex flex-col gap-1', className)}>
<RadioGroup
value={normalizedValue}
onValueChange={(next) => {

const parsed = Number.parseInt(next, 10);
if (
Number.isInteger(parsed) &&
parsed >= 1 &&
parsed <= 5
          ) {
onValueChange(parsed);
          }
        }}
disabled={disabled}
aria-label={ariaLabel}
aria-invalid={errorMessage ? true : undefined}
aria-describedby={errorMessage ? errorId : undefined}
className='flex items-center gap-1'
      >
{STAR_VALUES.map((starValue) => {
const isSelected =
typeof value === 'number' && value >= starValue;
return (
<RadioGroupItem
key={starValue}
value={String(starValue)}
aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
className={cn(
'size-9 border-0 p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-2',
disabled && 'cursor-not-allowed opacity-50',
              )}
            >
<Star
aria-hidden='true'
className={cn(
'size-6 transition-colors',
isSelected
? 'fill-yellow-400 text-yellow-400'
: 'fill-transparent text-muted-foreground',
                )}
              />
</RadioGroupItem>
          );
        })}
</RadioGroup>
{errorMessage ? (
<p
id={errorId}
role='alert'
className='text-sm text-destructive'
        >
{errorMessage}
</p>
      ) : null}
</div>
  );
}
