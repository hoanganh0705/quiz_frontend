

'use client';

import { cn } from '@/shared/utils/merge-class-names';

import type { PlayerQuestion } from '../lib/quiz-player-view';

const CARD_OUTER =
'flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6';
const HEADER_ROW = 'flex items-baseline justify-between gap-3';
const POSITION_BADGE =
'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground';
const QUESTION_TEXT = 'text-base font-medium text-foreground sm:text-lg';
const IMAGE_WRAPPER =
'relative w-full overflow-hidden rounded-lg bg-muted';
const IMAGE_ASPECT = 'aspect-[16/9]';
const IMAGE_IMG = 'object-cover';
const OPTIONS_LIST = 'flex flex-col gap-2';
const OPTION_ROW =
'flex items-start gap-3 rounded-md border bg-background p-3 text-sm';
const OPTION_LETTER =
'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground';
const OPTION_TEXT = 'text-foreground';

export interface QuizQuestionCardProps {
question: PlayerQuestion;

displayPosition: number;
className?: string;
}

function optionLetter(position: number): string {

if (position <= 0) return '?';
if (position <= 26) {
return String.fromCharCode('A'.charCodeAt(0) + position - 1);
  }
return '?';
}

export function QuizQuestionCard({
question,
displayPosition,
className,
}: QuizQuestionCardProps) {
return (
<article
className={cn(CARD_OUTER, className)}
data-testid='quiz-question-card'
data-question-id={question.questionId}
data-position={displayPosition}
    >
<header className={HEADER_ROW}>
<span
className={POSITION_BADGE}
aria-label={`Question ${displayPosition}`}
        >
{displayPosition}
</span>
</header>

<p className={QUESTION_TEXT}>{question.questionText}</p>

{question.imageUrl ? (
<div className={cn(IMAGE_WRAPPER, IMAGE_ASPECT)}>
{/* Plain <img> (not next/image) so the primitive works
              inside unit tests without remote-pattern config. */}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={question.imageUrl}
alt={`Image for question ${displayPosition}`}
loading='lazy'
className={IMAGE_IMG}
          />
</div>
      ) : null}

<ol
className={OPTIONS_LIST}
data-testid='quiz-question-options'
aria-label={`Answer options for question ${displayPosition}`}
      >
{[...question.answerOptions]
          .sort((a, b) => a.position - b.position)
          .map((option) => (
<li
key={option.optionId}
className={OPTION_ROW}
data-testid='quiz-question-option'
data-option-id={option.optionId}
data-option-position={option.position}
            >
<span className={OPTION_LETTER} aria-hidden='true'>
{optionLetter(option.position)}
</span>
<span className={OPTION_TEXT}>{option.value}</span>
</li>
          ))}
</ol>
</article>
  );
}
