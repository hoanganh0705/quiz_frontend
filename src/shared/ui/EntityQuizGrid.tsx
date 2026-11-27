"use client";

import { QuizCardGrid } from "@/components/primitives";
import { Button } from "@/components/ui/Button";

import type { ApiError } from "@/lib/api";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";
import type { ReactNode } from "react";

export interface EntityQuizGridProps {
  items: readonly QuizListItemDto[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void> | void;
  retryBannerVisible?: boolean;
  emptyState: ReactNode;
  entityNoun: string;
  testIdPrefix: string;
  skeletonCount?: number;
}

export function EntityQuizGrid({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore,
  error,
  refresh,
  retryBannerVisible = false,
  emptyState,
  entityNoun,
  testIdPrefix,
  skeletonCount = 12,
}: EntityQuizGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div data-testid={`${testIdPrefix}-loading`}>
        <QuizCardGrid skeletonCount={skeletonCount} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-center py-12"
        role="alert"
        data-testid={`${testIdPrefix}-error`}
      >
        <p className="text-destructive text-lg mb-4">
          {error.status && error.status >= 500
            ? "Something went wrong on our end. Please try again."
            : `Could not load quizzes for this ${entityNoun}.`}
        </p>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          data-testid={`${testIdPrefix}-retry`}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return <div data-testid={`${testIdPrefix}-empty`}>{emptyState}</div>;
  }

  return (
    <div data-testid={testIdPrefix}>
      {retryBannerVisible ? (
        <div
          className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
          data-testid={`${testIdPrefix}-retry-banner`}
        >
          The server is having trouble. We&apos;ve retried several times —
          please refresh the page in a moment.
        </div>
      ) : null}

      <QuizCardGrid
        items={items}
        toQuiz={(item: QuizListItemDto) => item}
      />

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            data-testid={`${testIdPrefix}-load-more`}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
