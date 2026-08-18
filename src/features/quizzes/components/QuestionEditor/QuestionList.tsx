

'use client';

import { memo } from 'react';

import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';

import { QuestionListItem } from './QuestionListItem';

function QuestionListEmpty(): React.ReactElement {
return (
<div
className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center"
data-testid="question-list-empty"
    >
<div className="mx-auto max-w-sm space-y-2">
{/* Simple SVG illustration */}
<svg
className="mx-auto h-16 w-16 text-muted-foreground/50"
viewBox="0 0 64 64"
fill="none"
xmlns="http://www.w3.org/2000/svg"
aria-hidden="true"
        >
<circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
<path
d="M32 20v12M32 36v8"
stroke="currentColor"
strokeWidth="3"
strokeLinecap="round"
          />
</svg>
<h3 className="text-lg font-medium">No questions yet</h3>
<p className="text-sm text-muted-foreground">
This version has no questions yet. Add at least 5 to publish.
        </p>
</div>
</div>
  );
}

export interface QuestionListProps {

questions: QuizAuthorQuestionDto[];
}

export const QuestionList = memo(function QuestionList({
questions,
}: QuestionListProps): React.ReactElement {

const sortedQuestions = [...questions].sort((a, b) => a.position - b.position);

return (
<div className="space-y-4" data-testid="question-list">
<h2 className="text-lg font-semibold">
Questions
        {questions.length > 0 && (
<span className="ml-2 text-sm font-normal text-muted-foreground">
({questions.length})
          </span>
        )}
</h2>

{questions.length === 0 ? (
<QuestionListEmpty />
      ) : (
<div className="space-y-3">
{sortedQuestions.map((question) => (
<QuestionListItem
key={question.questionId}
question={question}
            />
          ))}
</div>
      )}
</div>
  );
});
