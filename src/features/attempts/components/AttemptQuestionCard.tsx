"use client";

import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { AttemptAnswerPicker } from "./AttemptAnswerPicker";

import type { QuizQuestionPlayerDto } from "@/lib/api/generated/schemas";

export interface AttemptQuestionCardProps {

question: QuizQuestionPlayerDto;

index: number;

total: number;

value: AnswerSelection | null;

onChange: (selection: AnswerSelection) => void;

isSubmitted: boolean;

isPending: boolean;

errorMessage?: string | null;

isQuestionInvalid?: boolean;
}

export function AttemptQuestionCard(
props: AttemptQuestionCardProps,
): React.ReactElement {
const {
question,
index,
total,
value,
onChange,
isSubmitted,
isPending: _isPending,
errorMessage = null,
isQuestionInvalid = false,
  } = props;

return (
<article
className={cn(
"rounded-lg border p-4 space-y-3",
isSubmitted
? "border-green-200 dark:border-green-900"
: "border-border",
isQuestionInvalid && "opacity-50",
      )}
data-testid={`question-card-${question.questionId}`}
aria-labelledby={`q-${question.questionId}-heading`}
    >
<header className="flex items-center justify-between gap-2">
<h3
id={`q-${question.questionId}-heading`}
className="text-base font-medium wrap-break-word"
        >
<span className="text-muted-foreground mr-2">
{index}/{total}
</span>
{question.questionText}
</h3>
</header>

{question.imageUrl ? (
<img
src={question.imageUrl}
alt=""
className="max-h-64 rounded border border-border"
data-testid={`question-card-${question.questionId}-image`}
        />
      ) : null}

<AttemptAnswerPicker
question={question}
value={value}
onChange={onChange}
isLocked={isSubmitted}
isPending={false}
errorMessage={errorMessage}
testIdPrefix={`qc-${question.questionId}`}
      />
</article>
  );
}
