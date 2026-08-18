'use client';

import * as React from 'react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { cn } from '@/shared/utils/merge-class-names';

import { deriveQuestionKind } from '@/features/attempts/lib/attempt-answer-validation';
import type {
AnswerSelection,
} from '@/features/attempts/types/attempt-runner.types';

import type {
QuizQuestionPlayerDto,
} from '@/lib/api/generated/schemas';

export interface AttemptAnswerPickerProps {

question: QuizQuestionPlayerDto;

value: AnswerSelection | null;

onChange: (selection: AnswerSelection) => void;

isLocked?: boolean;

isPending?: boolean;

errorMessage?: string | null;

testIdPrefix?: string;
}

export function AttemptAnswerPicker(
props: AttemptAnswerPickerProps,
): React.ReactElement {
const {
question,
value,
onChange,
isLocked = false,
isPending = false,
errorMessage = null,
testIdPrefix,
  } = props;

const kind = deriveQuestionKind(question);
const disabled = isLocked || isPending;
const errorId = React.useId();
const groupId = React.useId();

if (kind === 'true_false') {
const trueOption = question.answerOptions.find(
(o) => typeof o.value === 'string' && o.value.toLowerCase() === 'true',
    );
const falseOption = question.answerOptions.find(
(o) => typeof o.value === 'string' && o.value.toLowerCase() === 'false',
    );

if (!trueOption || !falseOption) {

return (
<p
className="text-sm text-muted-foreground"
data-testid={testIdPrefix ? `${testIdPrefix}-malformed` : undefined}
        >
This question cannot be answered.
        </p>
      );
    }

const currentValue =
value?.kind === 'true_false' && value.questionId === question.questionId
? String(value.value)
: '';

return (
<div
className="space-y-2"
data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
      >
<RadioGroup
id={groupId}
value={currentValue}
disabled={disabled}
onValueChange={(next) => {
if (disabled) return;
const boolValue = next === 'true';
onChange({
kind: 'true_false',
questionId: question.questionId,
value: boolValue,
            });
          }}
aria-describedby={errorMessage ? errorId : undefined}
aria-invalid={errorMessage ? true : undefined}
        >
{[trueOption, falseOption].map((option) => {
const optionValue = option.value ?? '';
return (
<div
key={option.optionId}
className="flex items-center gap-2"
              >
<RadioGroupItem
id={`${groupId}-${option.optionId}`}
value={optionValue}
data-testid={testIdPrefix ? `${testIdPrefix}-${option.optionId}` : undefined}
                />
<Label htmlFor={`${groupId}-${option.optionId}`}>
{option.value}
</Label>
</div>
            );
          })}
</RadioGroup>
{errorMessage ? (
<p
id={errorId}
className="text-sm text-destructive"
role="alert"
data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
          >
{errorMessage}
</p>
        ) : null}
</div>
    );
  }

const currentIds =
value?.kind === 'multiple_choice' && value.questionId === question.questionId
? value.selectedOptionIds
: [];

return (
<div
className="space-y-2"
data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
    >
<RadioGroup
id={groupId}
value={currentIds[0] ?? ''}
disabled={disabled}
onValueChange={(next) => {
if (disabled) return;
onChange({
kind: 'multiple_choice',
questionId: question.questionId,
selectedOptionIds: [next],
          });
        }}
aria-describedby={errorMessage ? errorId : undefined}
aria-invalid={errorMessage ? true : undefined}
      >
{question.answerOptions.map((option) => (
<div key={option.optionId} className="flex items-center gap-2">
<RadioGroupItem
id={`${groupId}-${option.optionId}`}
value={option.optionId}
data-testid={testIdPrefix ? `${testIdPrefix}-${option.optionId}` : undefined}
            />
<Label htmlFor={`${groupId}-${option.optionId}`}>
{option.value}
</Label>
</div>
        ))}
</RadioGroup>
{errorMessage ? (
<p
id={errorId}
className={cn('text-sm text-destructive')}
role="alert"
data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
        >
{errorMessage}
</p>
      ) : null}
</div>
  );
}

void Input;