"use client";

import { cn } from "@/shared/utils/merge-class-names";

import {
useQuestionRevealed,
type UseQuestionRevealedResult,
} from "@/features/instances/play/hooks";

import { GameSkeleton } from "./shared/GameSkeleton";
import { GameEmptyState } from "./shared/GameEmptyState";

interface QuestionCardProps {
instanceId: string;
className?: string;
}

export function QuestionCard({ instanceId, className }: QuestionCardProps) {
const { bundle, hasRevealed, isStale }: UseQuestionRevealedResult =
useQuestionRevealed(instanceId);

if (!hasRevealed) {
return (
<div className={cn("space-y-4", className)}>
<GameSkeleton />
</div>
    );
  }

if (!bundle) {
return (
<div className={className}>
<GameEmptyState />
</div>
    );
  }

const { question } = bundle;

return (
<div
className={cn("space-y-4", className)}
data-testid="question-card"
role="region"
aria-label="Current question"
aria-live="polite"
    >
{/* Metadata badges */}
<div className="flex flex-wrap items-center gap-2">
{/* Question index */}
<span
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
data-testid="question-index"
        >
Q{question.index} / {question.total}
</span>

{/* Category */}
{question.category && (
<span
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
data-testid="question-category"
          >
{question.category}
</span>
        )}

{/* Difficulty */}
{question.difficulty && (
<span
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
data-testid="question-difficulty"
          >
{question.difficulty}
</span>
        )}

{/* Base points */}
{question.basePoints !== undefined && question.basePoints > 0 && (
<span
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
data-testid="question-points"
          >
{question.basePoints} pts
            {question.difficultyMultiplier && question.difficultyMultiplier !== 1
? ` ×${question.difficultyMultiplier}`
: null}
</span>
        )}
</div>

{/* Question text */}
<div className="space-y-2">
<h2
className="text-lg font-semibold text-foreground leading-relaxed"
data-testid="question-text"
        >
{question.text}
</h2>
</div>

{/* Optional media */}
{question.mediaUrl && (
<div className="rounded-lg overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={question.mediaUrl}
alt="Question media"
className="w-full max-h-64 object-contain"
data-testid="question-media"
          />
</div>
      )}

{/* Stale indicator (subtle, does not block content) */}
{isStale && (
<div className="text-xs text-amber-600 dark:text-amber-400">
A new question may be available.
        </div>
      )}
</div>
  );
}
