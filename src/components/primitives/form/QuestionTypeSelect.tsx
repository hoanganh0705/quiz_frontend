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

export interface QuestionTypeSelectProps<
T extends z.ZodType<FieldValues, any, any>
> {
name: Path<z.infer<T>>;
label: string;
description?: string;

disabled?: boolean;

className?: string;
}

export const QUESTION_TYPE_VALUES = [
'single_choice',
'multiple_choice',
'true_false',
'short_answer',
'fill_in_the_blank',
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

const QUESTION_TYPE_FALLBACK: QuestionType = 'single_choice';

const QUESTION_TYPE_INVALID_COPY = `Question type reset to ${QUESTION_TYPE_FALLBACK} — invalid value.`;

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
single_choice: 'Single choice',
multiple_choice: 'Multiple choice',
true_false: 'True / False',
short_answer: 'Short answer',
fill_in_the_blank: 'Fill in the blank',
};

function isValidQuestionType(value: unknown): value is QuestionType {
return (
typeof value === 'string' &&
(QUESTION_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function QuestionTypeSelect<
T extends z.ZodType<FieldValues, any, any>
>(props: QuestionTypeSelectProps<T>): React.ReactElement {
const { name, label, description, disabled, className } = props;

const { field, fieldState, formState } = useController({ name });
const [showFallbackBanner, setShowFallbackBanner] = React.useState(false);

const initialCheckRanRef = React.useRef(false);
React.useEffect(() => {
if (initialCheckRanRef.current) return;
initialCheckRanRef.current = true;
if (!isValidQuestionType(field.value)) {
field.onChange(QUESTION_TYPE_FALLBACK);
setShowFallbackBanner(true);
    }
  }, [field]);

const selectDisabled =
disabled === true ? true : disabled === false ? false : formState.isSubmitting;

const errorMessage = fieldState.error?.message;
const inputId = React.useId();

return (
<div className={cn('space-y-2', className)} data-testid={`question-type-select-${name}`}>
<Label htmlFor={inputId}>{label}</Label>
{description ? (
<p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
<Select
value={isValidQuestionType(field.value) ? field.value : QUESTION_TYPE_FALLBACK}
onValueChange={(next) => {
if (typeof next === 'string') {
field.onChange(next);
          }
        }}
disabled={selectDisabled}
name={field.name}
      >
<SelectTrigger id={inputId} data-testid={`question-type-select-trigger-${name}`}>
<SelectValue placeholder='Select question type' />
</SelectTrigger>
<SelectContent>
{QUESTION_TYPE_VALUES.map((option) => (
<SelectItem key={option} value={option}>
{QUESTION_TYPE_LABEL[option]}
</SelectItem>
          ))}
</SelectContent>
</Select>
{showFallbackBanner ? (
<p
className='text-xs text-warning'
role='status'
aria-live='polite'
data-testid={`question-type-select-fallback-banner-${name}`}
        >
{QUESTION_TYPE_INVALID_COPY}
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