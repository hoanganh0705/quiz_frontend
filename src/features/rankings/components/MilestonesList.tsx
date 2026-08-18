"use client";

import { Award, Trophy } from "lucide-react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useRankingMilestones } from "@/features/rankings/hooks";
import {
MilestonesListSkeleton,
RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface MilestonesListProps {
className?: string;
}

const FEATURED_MILESTONES = new Set(["TOP_100", "TOP_10", "TOP_1"]);

export function MilestonesList({ className }: MilestonesListProps) {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { isAuthenticated, bootstrapState } = useAuthSession();

const { milestones, isLoading, error, retry, isStale } =
useRankingMilestones();

if (isFlagPlaceholder) return null;
if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

if (isLoading && milestones.length === 0) {
return <MilestonesListSkeleton className={className} />;
  }

if (error && milestones.length === 0) {
return (
<RankingErrorState
error={error}
onRetry={() => void retry()}
className={className}
      />
    );
  }

if (milestones.length === 0) {
return (
<section
data-testid="milestones-empty"
aria-label="No milestones yet"
className={`rounded-lg border bg-card p-6 ${className ?? ""}`}
      >
<p className="text-sm text-muted-foreground">
No milestones yet. Reach the top 100 on the global leaderboard
          to unlock your first milestone.
        </p>
</section>
    );
  }

return (
<section
data-testid="milestones-list"
aria-busy={isStale}
aria-label="Ranking milestones"
className={`space-y-3 ${className ?? ""}`}
    >
<h2 className="text-sm font-semibold">Milestones</h2>
<ul className="space-y-2">
{milestones.map((m) => {
const isFeatured = FEATURED_MILESTONES.has(m.milestone);
return (
<li
key={m.id}
className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
{isFeatured ? (
<Trophy
aria-hidden="true"
className="h-8 w-8 shrink-0 text-amber-500"
                />
              ) : (
<Award
aria-hidden="true"
className="h-7 w-7 shrink-0 text-muted-foreground"
                />
              )}
<div className="flex-1">
<p className="text-sm font-medium">
{humanizeMilestone(m.milestone)}
</p>
<p className="text-xs text-muted-foreground">
Achieved {formatDate(m.achievedAt)}
</p>
</div>
<span className="text-sm tabular-nums text-muted-foreground">
#{m.rank}
</span>
</li>
          );
        })}
</ul>
</section>
  );
}

const MILESTONE_LABELS: Record<string, string> = {
TOP_10000: "Top 10,000",
TOP_1000: "Top 1,000",
TOP_100: "Top 100",
TOP_50: "Top 50",
TOP_10: "Top 10",
TOP_3: "Top 3",
TOP_1: "Top 1",
};

function humanizeMilestone(code: string): string {
return MILESTONE_LABELS[code] ?? code;
}

function formatDate(iso: string): string {
const d = new Date(iso);
if (Number.isNaN(d.getTime())) return iso;
try {
return new Intl.DateTimeFormat(undefined, {
year: "numeric",
month: "short",
day: "numeric",
    }).format(d);
  } catch {
return iso;
  }
}