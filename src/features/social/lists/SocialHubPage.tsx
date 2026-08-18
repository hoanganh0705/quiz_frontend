"use client";

import Link from "next/link";
import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSocialCounts } from "@/features/social/hooks/useSocialCounts";
import { SocialCountsCard } from "@/features/social/components/SocialCountsCard";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import {
addSocialAnalyticsBreadcrumb,
SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/social-block-sentry";

interface EntryTileConfig {
testId: string;
href: (userId: string) => string;
title: string;
description: string;
}

const TILES: readonly EntryTileConfig[] = [
{
testId: "social-hub-entry-my-analytics",
href: () => "/social/me/analytics",
title: "Your analytics",
description: "See your activity breakdowns by week, month, or all time.",
  },
{
testId: "social-hub-entry-leaderboard",
href: () => "/social/friends/leaderboard",
title: "Friend leaderboard",
description: "See how you rank among your friends.",
  },
{
testId: "social-hub-entry-stats",
href: (userId) => `/social/users/${encodeURIComponent(userId)}/stats`,
title: "Your stats",
description: "Public stats for your profile.",
  },
];

interface SocialHubPageProps {

currentUserIdOverride?: string | null;
}

export function SocialHubPage(
props: SocialHubPageProps = {},
): ReactElement {
const { currentUserIdOverride = null } = props;
const auth = useAuthSession();
const viewerId =
currentUserIdOverride ?? auth.currentUser?.userId ?? null;

const key = useMemo(
() => (viewerId === null ? null : viewerId),
[viewerId],
  );

const { counts, isLoading, isStale, error, retry } = useSocialCounts(key);

const prevFetchStateRef = useRef<"loading" | "ready" | "error">(
error !== null ? "error" : counts !== null ? "ready" : "loading",
  );
useEffect(() => {
const next: "loading" | "ready" | "error" =
error !== null ? "error" : counts !== null ? "ready" : "loading";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialAnalyticsBreadcrumb({
route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
kind: "stats",
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [counts, error]);

if (viewerId === null) {
return (
<section
data-testid="social-hub-page"
aria-label="Social Hub"
className="flex flex-col gap-3 p-6"
      >
<h1 className="text-xl font-semibold">Social</h1>
</section>
    );
  }

return (
<section
data-testid="social-hub-page"
aria-label="Social Hub"
className="flex flex-col gap-6 p-6"
    >
<h1 className="text-xl font-semibold">Social</h1>
<div data-testid="social-hub-counts-card-slot">
{error !== null && counts === null ? (
<SocialListErrorState
error={error}
isStale={isStale}
onRetry={() => {
void retry();
            }}
          />
        ) : counts === null && isLoading ? (
<SocialHubCountsSkeleton />
        ) : (
<SocialCountsCard targetUserId={viewerId} variant="hub" />
        )}
</div>
<nav
data-testid="social-hub-entry-tiles"
aria-label="Social surfaces"
className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
{TILES.map((tile) => (
<Link
key={tile.testId}
href={tile.href(viewerId)}
data-testid={tile.testId}
className="rounded-md border border-border bg-background p-4 hover:bg-accent"
          >
<span className="block text-base font-medium">{tile.title}</span>
<span className="mt-1 block text-sm text-muted-foreground">
{tile.description}
</span>
</Link>
        ))}
</nav>
</section>
  );
}

function SocialHubCountsSkeleton(): ReactElement {
return (
<div
data-testid="social-counts-card-skeleton"
aria-hidden="true"
className="flex flex-col gap-1 p-4 rounded-md border border-border"
    >
<div className="flex flex-wrap gap-2">
<div
data-slot="skeleton"
className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
<div
data-slot="skeleton"
className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
<div
data-slot="skeleton"
className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
</div>
</div>
  );
}