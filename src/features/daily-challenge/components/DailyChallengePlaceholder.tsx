"use client";

/**
 * `DailyChallengePlaceholder` — the placeholder surface.
 *
 * Rendered when the regenerated SDK does not expose a daily-challenge
 * operation OR when the env-var override
 * `NEXT_PUBLIC_DAILY_CHALLENGE_PAGE=placeholder` is set.
 *
 * The surface is a single, static "Coming soon" card with a spinner
 * icon and a short copy block. It is intentionally empty of
 * interaction — there is no `onClick`, no `Button`, and no
 * loading/error state. The locked default never animates.
 *
 * ## Layout
 *
 * The placeholder's outer dimensions (`min-h-40`, fixed `padding`,
 * fixed `gap`) match the live `<DailyChallengeCard />`'s dimensions
 * exactly. A future change that alters one without the other will
 * fail the `DailyChallengeSkeleton.matchesCardDimensions` test in B3.
 *
 * ## Accessibility
 *
 * The placeholder is a non-interactive, non-loading region — the
 * `aria-live='polite'` and `aria-busy='false'` combination prevents
 * screen readers from announcing it as "loading". A screen reader
 * user lands on the page, the placeholder announces as "Coming soon",
 * and there is no ambient reload.
 */

import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { cn } from "@/shared/utils/merge-class-names";

export interface DailyChallengePlaceholderProps {
  className?: string;
}

export function DailyChallengePlaceholder({
  className,
}: DailyChallengePlaceholderProps) {
  return (
    <Card
      role="region"
      aria-labelledby="daily-challenge-placeholder-title"
      aria-live="polite"
      aria-busy={false}
      data-testid="daily-challenge-placeholder"
      className={cn(
        "min-h-40 rounded-xl border border-border/70 bg-card text-foreground shadow-xs py-6",
        className,
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle
              id="daily-challenge-placeholder-title"
              className="text-xl font-bold"
            >
              Daily Challenge
            </CardTitle>
            <p className="mt-1 text-foreground-secondary text-sm">
              A new curated set of questions, every day. Keep your streak, earn
              XP, and climb the global leaderboard.
            </p>
          </div>
          <div
            className="flex items-center space-x-2 text-muted-foreground text-sm"
            aria-label="Coming soon"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">Coming soon</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary">
          We&apos;re preparing the daily-challenge experience. Check back soon —
          your streak starts the moment the first challenge goes live.
        </p>
      </CardContent>
    </Card>
  );
}
