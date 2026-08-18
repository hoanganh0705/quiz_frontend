"use client";

import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useMySocialAnalytics } from "@/features/social/hooks/useMySocialAnalytics";
import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { AnalyticsPeriodFilter } from "@/features/social/components/AnalyticsPeriodFilter";
import { AnalyticsChart } from "@/features/social/components/AnalyticsChart";
import type { AnalyticsWidget } from "@/features/social/components/AnalyticsChart";
import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { MyAnalyticsSkeleton } from "@/features/social/components/MyAnalyticsSkeleton";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";

import {
addSocialAnalyticsBreadcrumb,
SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/social-block-sentry";

const GROWTH_HORIZON_DAYS = 30;

function toAnalyticsWidgets(analytics: {
friends: number;
followers: number;
following: number;
growth30Days: number;
}): readonly AnalyticsWidget[] {
return [
{
id: "friend_count",
value: analytics.friends,
label: "Friends",
description: "Users that follow each other with you.",
    },
{
id: "follower_count",
value: analytics.followers,
label: "Followers",
description: "Users following your profile.",
    },
{
id: "following_count",
value: analytics.following,
label: "Following",
description: "Users you follow.",
    },
{
id: "ranking_xp_week",
value: analytics.growth30Days,
label: `Growth (last ${GROWTH_HORIZON_DAYS} days)`,
description: `Net follower growth over the last ${GROWTH_HORIZON_DAYS} days.`,
    },
  ];
}

export function MyAnalyticsPage(): ReactElement {
const auth = useAuthSession();
const { period } = usePeriodFilter();
const { analytics, isLoading, isStale, error, retry, staleness } =
useMySocialAnalytics(period);

const prevFetchRef = useRef<{
state: "loading" | "ready" | "error";
period: typeof period;
  } | null>(null);
useEffect(() => {
const next: "loading" | "ready" | "error" =
error !== null ? "error" : analytics !== null ? "ready" : "loading";
if (
prevFetchRef.current?.state === next &&
prevFetchRef.current.period === period
    ) {
return;
    }
prevFetchRef.current = { state: next, period };
addSocialAnalyticsBreadcrumb({
route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
kind: "my-analytics",
period,
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [analytics, error, period]);

const widgets = useMemo(
() => (analytics !== null ? toAnalyticsWidgets(analytics) : []),
[analytics],
  );

if (isLoading && analytics === null) {
return (
<section
data-testid="my-analytics-page-loading"
className="flex flex-col gap-3 p-6"
aria-label="Your analytics"
      >
<AnalyticsPeriodFilter />
<MyAnalyticsSkeleton />
</section>
    );
  }

if (error !== null && analytics === null) {
return (
<section
data-testid="my-analytics-page-error"
className="flex flex-col gap-3 p-6"
aria-label="Your analytics"
      >
<AnalyticsPeriodFilter />
<AnalyticsErrorState
error={error}
isStale={isStale}
onRetry={() => {
retry();
          }}
        />
</section>
    );
  }

if (widgets.length === 0) {
return (
<section
data-testid="my-analytics-page-empty"
className="flex flex-col gap-3 p-6"
aria-label="Your analytics"
      >
<AnalyticsPeriodFilter />
<AnalyticsEmptyState kind="my-analytics" period={period} />
</section>
    );
  }

if (!auth.isAuthenticated) {
return (
<section
data-testid="my-analytics-page"
className="flex flex-col gap-3 p-6"
aria-label="Your analytics"
      />
    );
  }

return (
<section
data-testid="my-analytics-page"
data-is-stale={isStale ? "true" : "false"}
data-period={period}
aria-label="Your analytics"
className="flex flex-col gap-3 p-6"
    >
<h1 className="text-xl font-semibold">Your analytics</h1>
<AnalyticsPeriodFilter />
{staleness !== "fresh" ? (
<ConsistencyNotice staleness={staleness} />
      ) : null}
<div
data-testid="my-analytics-page-grid"
className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
{widgets.map((w) => (
<AnalyticsChart key={w.id} widget={w} />
        ))}
</div>
</section>
  );
}