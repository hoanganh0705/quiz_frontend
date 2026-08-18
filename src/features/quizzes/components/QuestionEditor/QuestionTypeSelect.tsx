

'use client';

import { memo } from 'react';
import {
Circle,
CheckSquare,
ToggleLeft,
AlignLeft,
} from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

import type { QuestionType } from '@/features/quizzes/types/author-dtos';

interface QuestionTypeConfig {
value: QuestionType;
label: string;
description: string;
icon: React.ComponentType<{ className?: string }>;
}

const QUESTION_TYPE_OPTIONS: QuestionTypeConfig[] = [
{
value: 'single_choice',
label: 'Single choice',
description: 'One correct answer from multiple options',
icon: Circle,
  },
{
value: 'multiple_choice',
label: 'Multiple choice',
description: 'Multiple correct answers allowed',
icon: CheckSquare,
  },
{
value: 'true_false',
label: 'True / False',
description: 'Binary choice question',
icon: ToggleLeft,
  },
{
value: 'short_answer',
label: 'Short answer',
description: 'Text answer, auto-graded',
icon: AlignLeft,
  },
];

export interface QuestionTypeSelectProps {

value: QuestionType;

onChange: (type: QuestionType) => void;

disabled?: boolean;
}

export const QuestionTypeSelect = memo(function QuestionTypeSelect({
value,
onChange,
disabled,
}: QuestionTypeSelectProps): React.ReactElement {
return (
<div
className="grid grid-cols-2 gap-3 lg:grid-cols-4"
role="radiogroup"
aria-label="Question type"
data-testid="question-type-select"
    >
{QUESTION_TYPE_OPTIONS.map((option) => {
const isSelected = value === option.value;
const Icon = option.icon;

return (
<button
key={option.value}
type="button"
role="radio"
aria-checked={isSelected}
disabled={disabled}
className={cn(
'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all',
'hover:border-primary/50 hover:bg-primary/5',
'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
isSelected
? 'border-primary bg-primary/10 text-primary'
: 'border-border bg-card text-muted-foreground hover:text-foreground',
disabled && 'cursor-not-allowed opacity-50 hover:border-border hover:bg-card hover:text-muted-foreground',
            )}
onClick={() => !disabled && onChange(option.value)}
          >
<Icon className={cn('h-6 w-6', isSelected && 'text-primary')} />
<span className="text-sm font-medium">{option.label}</span>
<span className="text-xs text-muted-foreground">{option.description}</span>

{/* Selected indicator */}
{isSelected && (
<div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
<svg
className="h-3 w-3 text-primary-foreground"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="3"
strokeLinecap="round"
strokeLinejoin="round"
                >
<polyline points="20 6 9 17 4 12" />
</svg>
</div>
            )}
</button>
        );
      })}
</div>
  );
});
