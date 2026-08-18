

'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

import type { QuestionType } from '@/features/quizzes/types/author-dtos';

export interface QuestionCorrectMarkProps {

isCorrect: boolean;

questionType: QuestionType;

onChange: (isCorrect: boolean) => void;

disabled?: boolean;

name?: string;

id: string;
}

export const QuestionCorrectMark = memo(function QuestionCorrectMark({
isCorrect,
questionType,
onChange,
disabled,
name,
id,
}: QuestionCorrectMarkProps): React.ReactElement {
const isRadio = questionType === 'single_choice' || questionType === 'true_false';

return (
<div className="relative flex items-center">
{isRadio ? (
<button
type="button"
role="radio"
aria-checked={isCorrect}
aria-label="Mark as correct answer"
disabled={disabled}
name={name}
data-testid={`correct-mark-radio-${id}`}
className={cn(
'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
isCorrect
? 'border-green-500 bg-green-500 text-white'
: 'border-muted-foreground/30 bg-card hover:border-green-400',
disabled && 'cursor-not-allowed opacity-50',
          )}
onClick={() => !disabled && onChange(!isCorrect)}
        >
{isCorrect && <Check className="h-4 w-4" />}
</button>
      ) : (
<button
type="button"
role="checkbox"
aria-checked={isCorrect}
aria-label="Mark as correct answer"
disabled={disabled}
data-testid={`correct-mark-checkbox-${id}`}
className={cn(
'flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all',
'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
isCorrect
? 'border-green-500 bg-green-500 text-white'
: 'border-muted-foreground/30 bg-card hover:border-green-400',
disabled && 'cursor-not-allowed opacity-50',
          )}
onClick={() => !disabled && onChange(!isCorrect)}
        >
{isCorrect && <Check className="h-4 w-4" />}
</button>
      )}

{/* Tooltip on hover */}
{isCorrect ? (
<span className="sr-only">Correct answer</span>
      ) : (
<span className="sr-only">Incorrect answer</span>
      )}
</div>
  );
});
