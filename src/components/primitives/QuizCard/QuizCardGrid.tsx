"use client";

import { QuizCard } from "./QuizCard";
import { QuizCardSkeleton } from "./QuizCardSkeleton";
import { cn } from "@/shared/utils/merge-class-names";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

const GRID =
"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export interface QuizCardGridProps<T = QuizListItemDto> {
items?: readonly T[];
toQuiz?: (item: T) => QuizListItemDto;
skeletonCount?: number;
className?: string;
}

export function QuizCardGrid<T = QuizListItemDto>({
items,
toQuiz,
skeletonCount = 0,
className,
}: QuizCardGridProps<T>) {
const hasItems = Array.isArray(items) && items.length > 0;

if (hasItems) {
const mapper = toQuiz ?? ((x: unknown) => x as QuizListItemDto);
return (
<div className={cn(GRID, className)} data-testid="quiz-card-grid">
{items.map((item) => (
<QuizCard key={mapper(item).quizId} quiz={mapper(item)} />
        ))}
</div>
    );
  }

if (skeletonCount > 0) {
return (
<div
className={cn(GRID, className)}
data-testid="quiz-card-grid-skeletons"
      >
{Array.from({ length: skeletonCount }, (_, i) => (
<QuizCardSkeleton key={i} />
        ))}
</div>
    );
  }

return <div className={cn(GRID, className)} data-testid="quiz-card-grid" />;
}
