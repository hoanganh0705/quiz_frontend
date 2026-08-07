"use client";

/**
 * `SocialFeedPage` — Page that orchestrates the entire Story 6.9
 * global social feed surface.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.G1.
 *
 * ## What this component owns
 *
 * The canonical Story 6.9 surface. The page:
 *
 *   - Calls `useFeed(viewerUserId)` (TKT-6.9.D2) for the data.
 *   - Renders `FeedGlobalNotice` at the top (always).
 *   - Renders `FeedStaleMarker` when `staleness === "stale"`.
 *   - Renders the feed rows (`SocialFeedItem`) when `items.length > 0`.
 *   - Renders `FeedLoadMore` at the bottom of the feed when
 *     `hasMore === true || isLoadingMore === true || rateLimitedUntil !== null`.
 *   - Renders `FeedSkeleton` when `isLoading === true && items.length === 0`.
 *   - Renders `FeedEmptyState` when `items.length === 0 && error === null && visibility === "visible"`.
 *   - Renders `FeedErrorState` when `error !== null && items.length === 0`.
 *   - Renders `PrivacyRestrictedNotice` when `visibility !== "visible"`.
 *   - Wires `useSocialListLifecycleReset` so a logout transition
 *     clears any in-flight pagination state (the offset is
 *     implicitly reset because the SWR cache key excludes the
 *     offset — see TKT-6.9.D2).
 *
 * ## Branch ordering
 *
 * The branch order is fixed and asserted by the spec:
 *
 *   `visibility → rate-limit → loading → empty → error → items`
 *
 * The privacy (`visibility !== "visible"`) branch wins over the
 * rate-limit / loading / empty / error / items branches so the
 * privacy notice is always surfaced when the target user has
 * restricted the viewer. Rate-limit comes next so a rate-limited
 * viewer is told to wait even when the cache is empty.
 *
 * ## Why a client component
 *
 * The SWR cache (`useFeed` → `useOffsetPaginated`) is client-side.
 * Server-rendered shells receive the `SocialFeedPlaceholder`
 * (TKT-6.9.G1) until the client takes over.
 *
 * ## Scroll-guard behaviour
 *
 * The page is mounted at `/social/feed`; the browser's default
 * behaviour on back-navigation restores the scroll position for
 * the BFCache. The page intentionally does not call
 * `window.scrollTo` on mount; the App Router + browser
 * back-navigation is sufficient.
 */

import { useCallback, useMemo, type ReactElement } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
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

/**
 * The viewer-scoped page. The page is exposed as a named export so
 * `SocialFeedRouteGate` (TKT-6.9.G1) and the App Router route
 * module (`app/social/feed/page.tsx`, TKT-6.9.I1) can both import
 * it through the pages barrel.
 */
export function SocialFeedPage(): ReactElement {
  // ── Auth bootstrap ──────────────────────────────────────────────
  // The viewer id is read from the auth-bootstrap context. The
  // context returns `null` while the bootstrap is in flight; the
  // hook treats that as the unauthenticated branch. Mirrors the
  // `useRelationship` (TKT-6.1.D1) pattern.
  const auth = useAuthBootstrap();
  const viewerUserId = useMemo(
    () => auth.currentUser?.userId ?? null,
    [auth.currentUser],
  );

  // ── Data hook ───────────────────────────────────────────────────
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

  // ── Lifecycle reset wiring ─────────────────────────────────────
  // The feed has no client-side URL pagination state; the reset is
  // a no-op callback. The hook still wires the logout listener so
  // the SWR cache (which the hook itself clears) is invalidated on
  // a `true → false` auth transition.
  const noopReset = useCallback((): void => {
    // Intentionally empty — the feed SWR cache is cleared by
    // `useFeed` itself on the `auth-state-change` event.
  }, []);
  useSocialListLifecycleReset({
    targetUserId: viewerUserId,
    reset: noopReset,
  });

  // ── Privacy branch ─────────────────────────────────────────────
  // A non-visible viewer receives a privacy notice regardless of
  // any other state. The notice's `variant` is selected by the
  // visibility branch.
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

  // ── Rate-limit branch ──────────────────────────────────────────
  // When the cache is empty AND we are rate-limited, surface the
  // error state with the cooldown so the viewer knows to wait.
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

  // ── Loading branch ─────────────────────────────────────────────
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

  // ── Empty branch ───────────────────────────────────────────────
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

  // ── Error branch ───────────────────────────────────────────────
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

  // ── Items branch ───────────────────────────────────────────────
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
