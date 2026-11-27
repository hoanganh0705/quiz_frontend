"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";

import { BarChart3, Flame, Sparkles, UserPlus, Users } from "lucide-react";

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

import { Button } from "@/components/ui/Button";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import type { ReactElement } from "react";

function SocialFeedHeader(): ReactElement {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-brand shrink-0" aria-hidden="true" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Social Feed
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Live quiz completions, badges, and milestones from players you follow.
        </p>
      </div>
      <nav
        aria-label="Social shortcuts"
        className="flex flex-wrap items-center gap-2"
      >
        <Button asChild size="sm" variant="outline">
          <Link href="/friends">
            <Users className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Friends
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/social/suggestions">
            <UserPlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Suggestions
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/social/users/trending">
            <Flame className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Trending
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/social/me/analytics">
            <BarChart3 className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Analytics
          </Link>
        </Button>
      </nav>
    </header>
  );
}

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
    // Intentionally empty — the feed cache is cleared by
    // `useFeed` itself on the `auth-state-change` event.
  }, []);
  useSocialListLifecycleReset({
    targetUserId: viewerUserId,
    reset: noopReset,
  });

  if (visibility !== "visible") {
    if (visibility === "blocked_viewer" || visibility === "blocked_by_viewer") {
      return (
        <div data-testid="social-feed-page-privacy-blocked" className="p-4">
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
        <div data-testid="social-feed-page-privacy-private" className="p-4">
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
        className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      >
        <SocialFeedHeader />
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
        className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      >
        <SocialFeedHeader />
        <ConnectionStatusBadge />
        <FeedGlobalNotice />
        <FeedSkeleton rowCount={5} />
      </div>
    );
  }

  if (items.length === 0 && error === null && visibility === "visible") {
    return (
      <div
        data-testid="social-feed-page-empty"
        className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      >
        <SocialFeedHeader />
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
        className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      >
        <SocialFeedHeader />
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
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
    >
      <SocialFeedHeader />
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
            <SocialFeedItem item={item} viewerUserId={viewerUserId ?? ""} />
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
