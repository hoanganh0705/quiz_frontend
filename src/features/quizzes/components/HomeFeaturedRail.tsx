"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { WifiOff } from "lucide-react";

import { ApiError, getHome } from "@/lib/api";
import type {
HomeControllerGetBundle200,
QuizListItemDto,
} from "@/lib/api/generated/schemas";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

import { FEATURED_RAIL_LIMIT } from "@/features/quizzes/types/home-rails";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";
import { mutate } from "swr";

export interface HomeFeaturedRailProps {
items?: readonly QuizListItemDto[];
title?: string;
className?: string;
}

function FeaturedErrorPanel({
error,
onRetry,
}: {
error: ApiError;
onRetry: () => void;
}): React.ReactElement {
return (
<div
role="alert"
className="flex flex-col items-center gap-3 py-6"
data-testid="home-featured-rail-error"
    >
<EmptyState
icon={WifiOff}
title="Couldn’t load featured quizzes"
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
onClick={onRetry}
aria-hidden="true"
className="hidden"
data-testid="home-featured-rail-retry"
      >
Retry
      </Button>
</div>
  );
}

export function HomeFeaturedRail({
items,
title = "Featured",
className,
}: HomeFeaturedRailProps): React.ReactElement {
const { data, error, isLoading } = useSWR(
["home", "bundle"],
async () => {
const envelope = await getHome().homeControllerGetBundle();
const payload =
(envelope?.data as HomeControllerGetBundle200["data"] | undefined) ??
null;
return payload;
    },
{
revalidateOnFocus: false,
dedupingInterval: 5_000,
    },
  );

const featuredFromBundle = data?.featured ?? [];
const sourceQuizzes = items ?? featuredFromBundle;

const visibleQuizzes = sourceQuizzes.slice(0, FEATURED_RAIL_LIMIT);

const handleRetry = useCallback(() => {
void mutate(["home", "bundle"]);
  }, []);

return (
<QuizRail
layout="grid"
title={title}
subtitle="Specially selected quizzes you don’t want to miss"
gridItems={visibleQuizzes}
className={className}
    >
{isLoading && items === undefined ? (
<QuizRailSkeleton layout="grid" count={FEATURED_RAIL_LIMIT} />
      ) : error ? (
<FeaturedErrorPanel onRetry={handleRetry} error={error} />
      ) : visibleQuizzes.length === 0 ? (
<QuizRailEmpty
title="Featured set is being curated"
description="Check back soon."
        />
      ) : (
<div hidden />
      )}
</QuizRail>
  );
}
