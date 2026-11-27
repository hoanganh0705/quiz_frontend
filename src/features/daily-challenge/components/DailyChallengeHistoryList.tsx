"use client";

import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

import { cn } from "@/shared/utils/merge-class-names";

import { DailyChallengeHistoryEmptyState } from "./DailyChallengeHistoryEmptyState";

import type { DailyChallengeHistoryItemWithId } from "../hooks";

export interface DailyChallengeHistoryListProps {
  items: readonly DailyChallengeHistoryItemWithId[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function DailyChallengeHistoryList({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  className,
}: DailyChallengeHistoryListProps) {
  if (items.length === 0) {
    return <DailyChallengeHistoryEmptyState className={className} />;
  }

  return (
    <Card
      role="region"
      aria-labelledby="daily-challenge-history-title"
      data-testid="daily-challenge-history-list"
      className={cn("border bg-background text-foreground py-6", className)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 id="daily-challenge-history-title" className="text-xl font-bold">
            Challenge History
          </h2>
          {hasMore && onLoadMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              aria-label={
                isLoadingMore
                  ? "Loading more challenge history"
                  : "Load more past challenges"
              }
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/80 bg-background text-foreground-secondary hover:text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
            >
              <span className="text-xs font-medium">
                {isLoadingMore ? "Loading…" : "Load more"}
              </span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((challenge) => (
            <div
              key={challenge.id}
              data-testid="daily-challenge-history-item"
              className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 transition-colors shadow-2xs"
            >
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold tracking-tight text-foreground mb-1 truncate">
                  <span data-testid="daily-challenge-history-item-title">
                    {challenge.quizTitle}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs mb-2.5 font-mono tabular-nums">
                  <time dateTime={challenge.date}>{challenge.date}</time>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    data-testid="daily-challenge-history-item-category"
                    className="bg-background text-foreground border-border py-0.5 px-2.5 rounded-full capitalize text-xs"
                  >
                    {challenge.difficulty}
                  </Badge>
                  {challenge.isTopTen && (
                    <Badge
                      variant="difficulty-hard"
                      className="py-0.5 px-2.5 rounded-full text-xs font-semibold"
                      data-testid="daily-challenge-history-item-top-ten"
                    >
                      Top 10
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-bold font-mono tabular-nums text-foreground mb-1">
                  {challenge.score}%
                </div>
                <div className="text-muted-foreground text-xs font-mono tabular-nums">
                  Rank #{challenge.rank}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
