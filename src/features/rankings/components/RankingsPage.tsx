"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Filter } from "lucide-react";

import { isRankingSurfaceEnabled } from "@/features/rankings/flags";
import { RankingSummaryCard } from "@/features/rankings/components/RankingSummaryCard";
import { MilestonesList } from "@/features/rankings/components/MilestonesList";
import { LeaderboardTable } from "@/features/rankings/components/LeaderboardTable";
import { RankingHistory } from "@/features/rankings/components/RankingHistory";
import { RankingsPlaceholder } from "@/features/rankings/components/shared/Placeholder";
import type { RankingPeriod } from "@/features/rankings/types";

interface RankingsPageProps {
className?: string;
}

const QUERY_PERIOD = "period";

const DEFAULT_PERIOD: RankingPeriod = "all_time";

function parsePeriod(value: string | null | undefined): RankingPeriod | undefined {
if (value === "weekly" || value === "monthly" || value === "all_time") {
return value;
  }
return undefined;
}

interface PeriodChipProps {
label: string;
active: boolean;
onClick: () => void;
}

function PeriodChip({ label, active, onClick }: PeriodChipProps) {
return (
<button
type="button"
onClick={onClick}
aria-pressed={active}
data-testid={`rankings-period-${label.toLowerCase()}`}
className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
active
? "border-primary bg-primary text-primary-foreground"
: "border-border bg-background hover:bg-muted"
}`}
    >
{label}
</button>
  );
}

function PeriodFilter({
period,
onChange,
}: {
period: RankingPeriod;
onChange: (next: RankingPeriod) => void;
}) {
return (
<div
role="group"
aria-label="Leaderboard period"
data-testid="rankings-period-filter"
className="flex flex-wrap items-center gap-2"
    >
<span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
<Filter aria-hidden="true" className="h-3.5 w-3.5" />
Period
      </span>
<PeriodChip
label="Weekly"
active={period === "weekly"}
onClick={() => onChange("weekly")}
      />
<PeriodChip
label="Monthly"
active={period === "monthly"}
onClick={() => onChange("monthly")}
      />
<PeriodChip
label="All time"
active={period === "all_time"}
onClick={() => onChange("all_time")}
      />
</div>
  );
}

function RankingsPageInner({ className }: RankingsPageProps) {
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

const period = useMemo<RankingPeriod>(() => {
return parsePeriod(searchParams.get(QUERY_PERIOD)) ?? DEFAULT_PERIOD;
  }, [searchParams]);

const setPeriod = useCallback(
(next: RankingPeriod) => {
const params = new URLSearchParams(Array.from(searchParams.entries()));
if (next === DEFAULT_PERIOD) {
params.delete(QUERY_PERIOD);
      } else {
params.set(QUERY_PERIOD, next);
      }
const qs = params.toString();
router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, {
scroll: false,
      });
    },
[searchParams, router, pathname],
  );

return (
<main
data-testid="rankings-page"
className={`mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
    >
<header className="space-y-1">
<h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
<p className="text-sm text-muted-foreground">
Your personal rank, milestones, and the global leaderboard.
        </p>
</header>

<RankingSummaryCard />
<MilestonesList />
<PeriodFilter period={period} onChange={setPeriod} />
<LeaderboardTable period={period} />
<RankingHistory />
</main>
  );
}

export function RankingsPage({ className }: RankingsPageProps) {
const isLive = isRankingSurfaceEnabled();

if (!isLive) {
return (
<main
data-testid="rankings-page-placeholder"
className={`mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
      >
<RankingsPlaceholder />
</main>
    );
  }

return (
<Suspense fallback={null}>
<RankingsPageInner className={className} />
</Suspense>
  );
}
