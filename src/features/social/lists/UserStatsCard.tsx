"use client";

import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useUserSocialStats } from "@/features/social/hooks/useUserSocialStats";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { type AnalyticsWidget } from "@/features/social/components/AnalyticsChart";
import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { AnalyticsChart } from "@/features/social/components/AnalyticsChart";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { UserStatsSkeleton } from "@/features/social/components/UserStatsSkeleton";

import {
addSocialAnalyticsBreadcrumb,
SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/social-block-sentry";

interface UserStatsCardProps {

targetUserId: string;
}

function toAnalyticsWidgets(stats: {
friends: number;
followers: number;
following: number;
}): readonly AnalyticsWidget[] {
return [
{
id: "friend_count",
value: stats.friends,
label: "Friends",
description: "The number of users you both follow each other with.",
    },
{
id: "follower_count",
value: stats.followers,
label: "Followers",
description: "Users following this profile.",
    },
{
id: "following_count",
value: stats.following,
label: "Following",
description: "Users this profile follows.",
    },
  ];
}

export function UserStatsCard({
targetUserId,
}: UserStatsCardProps): ReactElement {
const result = useUserSocialStats(targetUserId);
const { visibility, stats, isLoading, isStale, error, retry } = result;

const auth = useAuthSession();
const viewerId = auth.currentUser?.userId ?? null;
const isSelf = viewerId !== null && viewerId === targetUserId;

const prevFetchStateRef = useRef<"loading" | "ready" | "error">(
error !== null ? "error" : stats !== null ? "ready" : "loading",
  );
useEffect(() => {
const next: "loading" | "ready" | "error" =
error !== null ? "error" : stats !== null ? "ready" : "loading";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialAnalyticsBreadcrumb({
route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
kind: "stats",
targetUserId,
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [stats, error, targetUserId]);

const widgets = useMemo(
() => (stats !== null ? toAnalyticsWidgets(stats) : []),
[stats],
  );

if (visibility !== "visible") {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />
    );
  }

if (isLoading && stats === null) {
return <UserStatsSkeleton />;
  }

if (isSelf && stats === null) {
return (
<section
data-testid="user-stats-card-self"
className="flex flex-col gap-3 p-6"
aria-label="Your stats"
      >
<h2 className="text-lg font-semibold">Your stats</h2>
<p className="text-sm text-muted-foreground">
See your deeper analytics on the My Analytics page.
        </p>
<UserStatsSkeleton />
</section>
    );
  }

if (error !== null && stats === null) {
return (
<AnalyticsErrorState
error={error}
isStale={isStale}
onRetry={() => {
retry();
        }}
      />
    );
  }

if (widgets.length === 0) {
return <AnalyticsEmptyState kind="stats" />;
  }

return (
<section
data-testid="user-stats-card"
data-is-stale={isStale ? "true" : "false"}
aria-label={`Stats for user ${targetUserId}`}
className="flex flex-col gap-3 p-6"
    >
<h2 className="text-lg font-semibold">Stats</h2>
{stats !== null && stats.isStale === true ? (
<ConsistencyNotice staleness="stale" />
      ) : null}
<div
data-testid="user-stats-card-grid"
className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
{widgets.map((w) => (
<AnalyticsChart key={w.id} widget={w} />
        ))}
</div>
{stats !== null && stats.isStale === true ? null : isStale ? (
<ConsistencyNotice staleness="recent" />
      ) : null}
</section>
  );
}