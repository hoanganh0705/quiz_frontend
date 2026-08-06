"use client";

/**
 * `FollowersList` — Followers list page component.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.E1.
 * Source ticket: TKT-6.2.G2 — fires `list.loaded` after a successful
 *                load-more so `useSocialCountsBadge` (TKT-6.2.D3) can
 *                revalidate and converge with the rendered list length.
 * Source ticket: TKT-6.2.H2 — emits a `phase6:6.2` Sentry breadcrumb
 *                around the data fetch via the centralised helper.
 *
 * ## What this component owns
 *
 * The full read-only followers surface for a target user. The
 * component:
 *
 *   - Fetches via `useFollowers(targetUserId)` (Epic 6.1 / TKT-6.1.D3).
 *   - Renders the `SocialListSkeleton` while loading and there are
 *     no cached rows.
 *   - Renders `SocialListErrorState` when the endpoint reports a
 *     non-404 error and there are no cached rows.
 *   - Renders `SocialListEmptyState` when the list is empty and
 *     not loading.
 *   - Renders a list of `SocialListRow` for each user when rows are
 *     available.
 *   - Renders a "Load more" footer that calls `useFollowers.loadMore`
 *     and then `publishSocialListLoaded` (TKT-6.2.G2).
 *   - Hooks the URL pagination state via `useSocialListUrlState`,
 *     so the page is deep-linkable and survives reload.
 *   - Uses `useSocialListLifecycleReset` so a logout / profile
 *     change resets the cursor and limit.
 *
 * ## Privacy
 *
 * Each row is rendered inside a `BlockedContentGate` so blocked
 * users are hidden from the rendered list. The gate is a no-op for
 * non-blocked rows, so the perf cost is negligible.
 */

import { type ReactElement, useEffect, useRef } from "react";

import { useFollowers } from "@/features/social/hooks/useFollowers";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";
import { useSocialListUrlState } from "@/features/social/hooks/useSocialListUrlState";

import { publishSocialListLoaded } from "@/lib/social/social-list-loaded-broadcast-channel";
import { addSocialListBreadcrumb } from "@/lib/social/phase6_6_2_sentry";

import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";

// ─── Public types ─────────────────────────────────────────────────────────

interface FollowersListProps {
  /** The target user id whose followers are being listed. */
  targetUserId: string;
  /** Whether the viewer is the owner of the followers list. */
  viewerIsOwner: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function FollowersList(props: FollowersListProps): ReactElement {
  const { targetUserId, viewerIsOwner } = props;

  const urlState = useSocialListUrlState(targetUserId);
  const { reset } = urlState;

  useSocialListLifecycleReset({ targetUserId, reset });

  const { users, isLoading, isStale, hasMore, loadMore, error, retry } =
    useFollowers(targetUserId);

  // TKT-6.2.H2 — emit a single `phase6:6.2` breadcrumb per fetch
  // transition. The `useRef` remembers the last reported state so
  // we only emit on transitions, not every render.
  const prevFetchStateRef = useRef<"loading" | "done" | "error">(
    isLoading ? "loading" : error !== null ? "error" : "done",
  );
  useEffect(() => {
    const next: "loading" | "done" | "error" = isLoading
      ? "loading"
      : error !== null
        ? "error"
        : "done";
    if (prevFetchStateRef.current === next) return;
    prevFetchStateRef.current = next;
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId,
      offset: urlState.cursor !== null ? Number(urlState.cursor) : 0,
      limit: urlState.limit,
      total: users.length,
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [isLoading, error, targetUserId, urlState.cursor, urlState.limit, users.length]);

  // TKT-6.2.G2 — emit the `list.loaded` event after a successful
  // load-more. The publisher is a no-op in SSR / environments
  // without `BroadcastChannel`, so this is safe to call from any
  // branch.
  const handleLoadMore = (): void => {
    loadMore();
    publishSocialListLoaded({
      kind: "followers",
      targetUserId,
      offset: users.length,
      limit: urlState.limit,
    });
  };

  // Initial load: show the skeleton.
  if (isLoading && users.length === 0) {
    return <SocialListSkeleton />;
  }

  // Error state with no cached rows.
  if (error !== null && users.length === 0) {
    return (
      <SocialListErrorState
        error={error}
        isStale={isStale}
        onRetry={() => {
          void retry();
        }}
      />
    );
  }

  // Empty state.
  if (users.length === 0) {
    return <SocialListEmptyState kind="followers" viewerIsOwner={viewerIsOwner} />;
  }

  return (
    <section
      data-testid="followers-list"
      aria-label="Followers"
      className="flex flex-col gap-2"
    >
      <ul className="flex flex-col gap-1">
        {users.map((user) => (
          <li key={user.userId}>
            <SocialListRow user={user} variant="summary" />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          data-testid="followers-list-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
          Load more
        </button>
      )}
    </section>
  );
}