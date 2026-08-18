"use client";

import { useCallback } from "react";
import { mutate } from "swr";
import { WifiOff } from "lucide-react";

import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuizCard } from "@/components/primitives/QuizCard/QuizCard";

import { useQuizzesTrending } from "@/features/quizzes/hooks/useQuizzesTrending";
import {
TRENDING_RAIL_LIMIT,
type QuizListItemDto,
type TrendingQuizItemDto,
} from "@/features/quizzes/types/home-rails";
import {
setTrendingCategory,
useTrendingCategoryId,
} from "@/features/quizzes/store/use-home-category-store";

import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";

export function trendingQuizItemToQuizListItem(
item: TrendingQuizItemDto,
): QuizListItemDto {
return {
quizId: item.quizId,
creatorId: (item.creatorId ?? null) as string | null,
creator: {
userId: (item.creatorId ?? "") as string,
username: "",
displayName: null,
avatarUrl: null,
    },
title: item.title,
description: "",
slug: item.slug,
requirements: null,
imageUrl: item.imageUrl ?? null,
categoryId: "",
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: undefined,
createdAt: "",
updatedAt: "",
publishedVersion: undefined,
questionCount: 0,
averageRating: 0,
reviewCount: 0,
attemptCount: 0,
tags: [],
  };
}

export interface HomeTrendingRailProps {
items?: readonly TrendingQuizItemDto[];
title?: string;
className?: string;
}

export function HomeTrendingRail({
title = "Trending",
className,
}: HomeTrendingRailProps): React.ReactElement {
const categoryId = useTrendingCategoryId();

const { quizzes, isLoading, error } = useQuizzesTrending({
limit: TRENDING_RAIL_LIMIT,
categoryId,
  });

const handleCategoryChange = useCallback((next: string | undefined) => {
setTrendingCategory(next);
  }, []);

const handleReset = useCallback(() => {
setTrendingCategory(undefined);
  }, []);

const handleRetry = useCallback(() => {
void mutate([
"quizzes",
"trending",
{ limit: TRENDING_RAIL_LIMIT, categoryId },
    ]);
  }, [categoryId]);

const filterSlot = (
<HomeCategoryFilter value={categoryId} onChange={handleCategoryChange} />
  );

const showSkeleton = isLoading && quizzes.length === 0;

return (
<QuizRail
layout="scroller"
title={title}
subtitle="What players are reaching for right now"
filter={filterSlot}
className={className}
    >
{showSkeleton ? (
<QuizRailSkeleton layout="scroller" count={TRENDING_RAIL_LIMIT} />
      ) : error && quizzes.length === 0 ? (
<TrendingErrorPanel onRetry={handleRetry} error={error} />
      ) : quizzes.length === 0 ? (
<QuizRailEmpty
title="No trending quizzes"
description={
categoryId
? "No trending quizzes in this category yet."
: "No trending quizzes yet."
          }
{...(categoryId
? {
actionLabel: "Show all categories",
onAction: handleReset,
              }
: {})}
        />
      ) : (
quizzes.map((item) => (
<QuizCard
key={item.quizId}
quiz={trendingQuizItemToQuizListItem(item)}
          />
        ))
      )}
</QuizRail>
  );
}

function TrendingErrorPanel({
error,
onRetry,
}: {
error: ApiError;
onRetry: () => void;
}): React.ReactElement {
return (
<div
role="alert"
className="flex w-full flex-col items-center gap-3 py-6"
data-testid="home-trending-rail-error"
    >
<EmptyState
icon={WifiOff}
title="Couldn’t load trending quizzes"
description={error.message || "Please try again."}
actions={[
{
label: "Retry",
onClick: onRetry,
variant: "default",
          },
        ]}
      />
<Button
variant="ghost"
size="sm"
aria-hidden="true"
className="hidden"
data-testid="home-trending-rail-retry"
      >
Retry
      </Button>
</div>
  );
}
