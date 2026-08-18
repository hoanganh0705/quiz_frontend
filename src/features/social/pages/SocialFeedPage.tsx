"use client";

import { useCallback, useMemo, type ReactElement } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { ConnectionStatusBadge } from "@/features/social/components/ConnectionStatusBadge";
import { FeedEmptyState } from "@/features/social/components/FeedEmptyState";
import { FeedErrorState } from "@/features/social/components/FeedErrorState";
import { FeedGlobalNotice } from "@/features/social/components/FeedGlobalNotice";
import { FeedLoadMore } from "@/features/social/components/FeedLoadMore";
import { FeedSkeleton } from "@/features/social/components/FeedSkeleton";
import { FeedStaleMarker } from "@/features/social/components/FeedStaleMarker";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialFeedItem } from "@/features/social/components/SocialFeedItem";
import { useFeed } from "@/features/social/hooks/useFeed";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";

export function SocialFeedPage(): ReactElement {

const auth = useAuthSession();
const viewerUserId = useMemo(
() => auth.currentUser?.userId ?? null,
[auth.currentUser],
  );

const {
items,
hasMore,
loadMore,
isLoading,
isLoadingMore,
error,
refresh,
staleness,
visibility,
rateLimitedUntil,
  } = useFeed(viewerUserId);

const noopReset = useCallback((): void => {
    // Intentionally empty — the feed SWR cache is cleared by
    // `useFeed` itself on the `auth-state-change` event.
  }, []);
useSocialListLifecycleReset({
targetUserId: viewerUserId,
reset: noopReset,
  });

if (visibility !== "visible") {
if (visibility === "blocked_viewer" || visibility === "blocked_by_viewer") {
return (
<div
data-testid="social-feed-page-privacy-blocked"
className="p-4"
        >
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="feed"
          />
<ConnectionStatusBadge />
</div>
      );
    }
if (visibility === "private" || visibility === "not_found") {
return (
<div
data-testid="social-feed-page-privacy-private"
className="p-4"
        >
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="feed"
          />
<ConnectionStatusBadge />
</div>
      );
    }
  }

if (items.length === 0 && error !== null && rateLimitedUntil !== null) {
return (
<div
data-testid="social-feed-page-rate-limited"
className="flex flex-col gap-2 p-4"
    >
<ConnectionStatusBadge />
<FeedGlobalNotice />
<FeedErrorState
error={error}
onRetry={() => {
void refresh();
          }}
        />
</div>
    );
  }

if (isLoading && items.length === 0) {
return (
<div
data-testid="social-feed-page-loading"
className="flex flex-col gap-2 p-4"
    >
<ConnectionStatusBadge />
<FeedGlobalNotice />
<FeedSkeleton rowCount={5} />
</div>
    );
  }

if (
items.length === 0 &&
error === null &&
visibility === "visible"
  ) {
return (
<div
data-testid="social-feed-page-empty"
className="flex flex-col gap-2 p-4"
    >
<ConnectionStatusBadge />
<FeedGlobalNotice />
<FeedEmptyState kind="empty" />
</div>
    );
  }

if (error !== null && items.length === 0) {
return (
<div
data-testid="social-feed-page-error"
className="flex flex-col gap-2 p-4"
    >
<ConnectionStatusBadge />
<FeedGlobalNotice />
<FeedErrorState
error={error}
onRetry={() => {
void refresh();
          }}
        />
</div>
    );
  }

return (
<div
data-testid="social-feed-page"
className="flex flex-col gap-2 p-4"
    >
<ConnectionStatusBadge />
<FeedGlobalNotice />
{staleness === "stale" ? <FeedStaleMarker isStale={true} /> : null}
<ul
role="list"
data-testid="social-feed-list"
className="flex flex-col gap-2"
      >
{items.map((item) => (
<li key={item.id} data-testid="social-feed-list-item">
<SocialFeedItem
item={item}
viewerUserId={viewerUserId ?? ""}
            />
</li>
        ))}
</ul>
<FeedLoadMore
hasMore={hasMore}
isLoadingMore={isLoadingMore}
rateLimitedUntil={rateLimitedUntil}
onLoadMore={loadMore}
      />
</div>
  );
}
