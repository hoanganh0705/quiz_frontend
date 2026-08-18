"use client";

import { useCallback } from "react";
import { mutate } from "swr";
import { WifiOff } from "lucide-react";

import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuizCard } from "@/components/primitives/QuizCard/QuizCard";

import { useQuizzesPopular } from "@/features/quizzes/hooks/useQuizzesPopular";
import {
POPULAR_RAIL_LIMIT,
type PopularQuizItemDto,
type QuizListItemDto,
} from "@/features/quizzes/types/home-rails";
import {
setPopularCategory,
usePopularCategoryId,
} from "@/features/quizzes/store/use-home-category-store";

import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";

export function popularQuizItemToQuizListItem(
item: PopularQuizItemDto,
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

export interface HomePopularRailProps {
items?: readonly PopularQuizItemDto[];
title?: string;
className?: string;
}

export function HomePopularRail({
title = "Popular",
className,
}: HomePopularRailProps): React.ReactElement {
const categoryId = usePopularCategoryId();

const { quizzes, isLoading, error } = useQuizzesPopular({
limit: POPULAR_RAIL_LIMIT,
categoryId,
  });

const handleCategoryChange = useCallback((next: string | undefined) => {
setPopularCategory(next);
  }, []);

const handleReset = useCallback(() => {
setPopularCategory(undefined);
  }, []);

const handleRetry = useCallback(() => {
void mutate([
"quizzes",
"popular",
{ limit: POPULAR_RAIL_LIMIT, categoryId },
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
subtitle="Player favourites this season"
filter={filterSlot}
className={className}
    >
{showSkeleton ? (
<QuizRailSkeleton layout="scroller" count={POPULAR_RAIL_LIMIT} />
      ) : error && quizzes.length === 0 ? (
<PopularErrorPanel onRetry={handleRetry} error={error} />
      ) : quizzes.length === 0 ? (
<QuizRailEmpty
title="No popular quizzes"
description={
categoryId
? "No popular quizzes in this category yet."
: "No popular quizzes yet."
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
quiz={popularQuizItemToQuizListItem(item)}
          />
        ))
      )}
</QuizRail>
  );
}

function PopularErrorPanel({
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
data-testid="home-popular-rail-error"
    >
<EmptyState
icon={WifiOff}
title="Couldn’t load popular quizzes"
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
data-testid="home-popular-rail-retry"
      >
Retry
      </Button>
</div>
  );
}
