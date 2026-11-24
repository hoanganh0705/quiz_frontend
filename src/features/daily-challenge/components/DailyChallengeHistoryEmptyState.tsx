"use client";

/**
 * `DailyChallengeHistoryEmptyState` — empty-state surface for the
 * history list.
 *
 * Rendered when the history list has no items. The component is also
 * rendered (transparently) by the list when `items.length === 0`. The
 * composition does NOT render the empty state alongside the list — the
 * list delegates.
 *
 * The surface is intentionally minimal: a single line of copy plus a
 * calendar icon. The empty state also covers the "missing-endpoint"
 * case via the page composition — the placeholder
 * renders instead of the empty state in that case; this empty state is
 * for a live, empty response.
 */

import { Calendar } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import { cn } from "@/shared/utils/merge-class-names";

export interface DailyChallengeHistoryEmptyStateProps {
  className?: string;
}

export function DailyChallengeHistoryEmptyState({
  className,
}: DailyChallengeHistoryEmptyStateProps) {
  return (
    <Card
      data-testid="daily-challenge-history-empty-state"
      role="region"
      aria-labelledby="daily-challenge-history-empty-title"
      className={cn(
        "rounded-xl border border-border/70 bg-card text-foreground shadow-xs py-6",
        className,
      )}
    >
      <CardContent className="flex items-center justify-center min-h-24 p-6 gap-3 text-muted-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/60 text-muted-foreground">
          <Calendar className="h-5 w-5" aria-hidden="true" />
        </div>
        <p
          id="daily-challenge-history-empty-title"
          className="text-sm font-medium text-foreground-secondary"
        >
          No past challenges yet. Take today&apos;s challenge to start your
          streak.
        </p>
      </CardContent>
    </Card>
  );
}
