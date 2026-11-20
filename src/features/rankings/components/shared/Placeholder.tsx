/**
 * Feature-specific placeholder primitives for ranking and
 * achievement surfaces.
 *
 * Each placeholder presents a static card with a "Coming soon"
 * affordance and feature-specific copy.
 *
 * The primitive lives under `features/rankings/components/shared/`
 * because it is consumed by both the rankings page and the achievements
 * page.
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
            <p className="mt-1 text-foreground-secondary text-sm">
              {description}
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
          We&apos;re laying the realtime foundation; this surface
          lights up once the relevant feature flag flips to live.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Placeholder card for the rankings page.
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
 * Placeholder card for the achievements page.
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
