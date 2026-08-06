"use client";

/**
 * `FollowingList` — Following list page component.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.E2.
 * Source ticket: TKT-6.2.G2 — fires `list.loaded` after a successful
 *                load-more (mirrors FollowersList).
 * Source ticket: TKT-6.2.H2 — emits a `phase6:6.2` Sentry breadcrumb
 *                around the data fetch via the centralised helper.
 *
 * ## What this component owns
 *
 * The read-only following surface for a target user. Mirrors
 * `FollowersList` (TKT-6.2.E1) with two differences:
 *
 *   - The data hook is `useFollowing` (Epic 6.1 / TKT-6.1.D3).
 *   - The empty-state copy is the "following" branch.
 *
 * The differences are isolated so a future feature divergence (e.g.
 * follow-back CTA on the following list) is a single-file change.
 */

import { type ReactElement, useEffect, useRef } from "react";

import { useFollowing } from "@/features/social/hooks/useFollowing";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";
import { useSocialListUrlState } from "@/features/social/hooks/useSocialListUrlState";

import { publishSocialListLoaded } from "@/lib/social/social-list-loaded-broadcast-channel";
import { addSocialListBreadcrumb } from "@/lib/social/phase6_6_2_sentry";

import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";

interface FollowingListProps {
  targetUserId: string;
  viewerIsOwner: boolean;
}

export function FollowingList(props: FollowingListProps): ReactElement {
  const { targetUserId, viewerIsOwner } = props;

  const urlState = useSocialListUrlState(targetUserId);
  const { reset } = urlState;

  useSocialListLifecycleReset({ targetUserId, reset });

  const { users, isLoading, isStale, hasMore, loadMore, error, retry } =
    useFollowing(targetUserId);

  // TKT-6.2.H2 — emit a single `phase6:6.2` breadcrumb per fetch
  // transition.
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
      kind: "following",
      targetUserId,
      offset: urlState.cursor !== null ? Number(urlState.cursor) : 0,
      limit: urlState.limit,
      total: users.length,
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [isLoading, error, targetUserId, urlState.cursor, urlState.limit, users.length]);

  // TKT-6.2.G2 — emit `list.loaded` after a successful load-more.
  const handleLoadMore = (): void => {
    loadMore();
    publishSocialListLoaded({
      kind: "following",
      targetUserId,
      offset: users.length,
      limit: urlState.limit,
    });
  };

  if (isLoading && users.length === 0) {
    return <SocialListSkeleton />;
  }

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

  if (users.length === 0) {
    return <SocialListEmptyState kind="following" viewerIsOwner={viewerIsOwner} />;
  }

  return (
    <section
      data-testid="following-list"
      aria-label="Following"
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
          data-testid="following-list-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
          Load more
        </button>
      )}
    </section>
  );
}