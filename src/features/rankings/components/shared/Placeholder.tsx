/**
 * Feature-specific placeholder primitives for Story 5.5 ranking and
 * achievement surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F1 / TKT-5.5.F2.
 *
 * Each placeholder mirrors the locked Phase 3 pattern from
 * `daily-challenge/components/DailyChallengePlaceholder.tsx`: a static
 * card with a "Coming soon" affordance and feature-specific copy.
 *
 * The primitive lives under `features/rankings/components/shared/`
 * because it is consumed by both the rankings page (TKT-5.5.F1) and
 * the achievements page (TKT-5.5.F2) — F2's `AchievementsPage`
 * imports it from here so feature internals stay co-located with the
 * ranking surface that owns the page-level composition.
 *
 * Why a feature-internal primitive (and not `lib/ui/`):
 *
 *   - The copy, the icon choice, and the testid are all feature-
 *     specific. Promoting to `lib/ui/` would force every consumer to
 *     bring their own copy, defeating the point.
 *   - The Phase 3 convention (TKT-3.12.B3) established a per-feature
 *     placeholder. We honour that.
 */

import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { cn } from "@/shared/utils/merge-class-names";

export interface PlaceholderProps {
  /** Headline surfaced as the `CardTitle`. */
  title: string;
  /** Two-sentence description surfaced under the title. */
  description: string;
  /** Optional `className` forwarded to the wrapper `Card`. */
  className?: string;
}

/**
 * Reusable feature-placeholder card.
 *
 * Not exported publicly — call sites use the feature-specific
 * wrappers below to keep the testid and `aria-labelledby` stable.
 */
function Placeholder({ title, description, className }: PlaceholderProps) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-placeholder-title`;
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      aria-live="polite"
      aria-busy={false}
      className={cn(
        "min-h-40 border bg-background text-foreground py-6",
        className,
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle id={headingId} className="text-xl font-bold">
              {title}
            </CardTitle>
            <p className="mt-1 text-foreground-secondary text-sm">{description}</p>
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
          We&apos;re laying the realtime foundation in Phase 5; this
          surface lights up once the relevant feature flag flips to
          live.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Placeholder card for the rankings page (TKT-5.5.F1 AC #1).
 */
export function RankingsPlaceholder({ className }: { className?: string }) {
  return (
    <div data-testid="rankings-placeholder">
      <Placeholder
        title="Rankings"
        description="Personal rank, milestones, and the global leaderboard will land in a future release."
        className={className}
      />
    </div>
  );
}

/**
 * Placeholder card for the achievements page (TKT-5.5.F2 AC #1).
 */
export function AchievementsPlaceholder({ className }: { className?: string }) {
  return (
    <div data-testid="achievements-placeholder">
      <Placeholder
        title="Achievements"
        description="Browse the badge catalog, your earned badges, and your full achievement history."
        className={className}
      />
    </div>
  );
}
