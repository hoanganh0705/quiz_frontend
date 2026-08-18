"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useMyRanking } from "@/features/rankings/hooks";
import { ConsistencyNotice } from "@/features/rankings/components/shared/ConsistencyNotice";
import {
RankingSummarySkeleton,
RankingEmptyState,
RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface RankingSummaryCardProps {
className?: string;
}

export function RankingSummaryCard({ className }: RankingSummaryCardProps) {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { bootstrapState, isAuthenticated } = useAuthSession();

const { summary, isLoading, error, retry, isStale, lastValidatedAt } =
useMyRanking();

if (isFlagPlaceholder) return null;
if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

if (isLoading && !summary) {
return <RankingSummarySkeleton className={className} />;
  }

if (error && !summary) {
return (
<RankingErrorState
error={error}
onRetry={() => void retry()}
className={className}
      />
    );
  }

if (!summary) {
return (
<RankingEmptyState
variant="summary"
className={className}
      />
    );
  }

return (
<section
data-testid="ranking-summary-card"
aria-label="Your ranking summary"
className={`rounded-lg border bg-card p-4 sm:p-6 space-y-3 ${className ?? ""}`}
    >
<header className="flex items-center justify-between gap-3">
<h2 className="text-base font-semibold">Your ranking</h2>
<ConsistencyNotice
isStale={isStale}
lastValidatedAt={lastValidatedAt}
        />
</header>

<div className="grid grid-cols-2 gap-4">
<div>
<p className="text-xs uppercase tracking-wide text-muted-foreground">
Global rank
          </p>
<p className="mt-1 text-2xl font-semibold tabular-nums">
{summary.globalRank ?? "—"}
</p>
</div>
<div>
<p className="text-xs uppercase tracking-wide text-muted-foreground">
Total XP
          </p>
<p className="mt-1 text-2xl font-semibold tabular-nums">
{summary.totalScore.toLocaleString()}
</p>
</div>
</div>
</section>
  );
}