"use client";

/**
 * `FriendsList` — Friends list page component with privacy-aware
 * rendering.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.E3.
 * Source ticket: TKT-6.2.G2 — fires `list.loaded` after a successful
 *                load-more so the counts badge can revalidate.
 * Source ticket: TKT-6.2.H2 — emits a `social:6.2` Sentry breadcrumb
 *                around the data fetch via the centralised helper.
 *
 * ## What this component owns
 *
 * The read-only friends surface for a target user. The component
 * differs from `FollowersList` / `FollowingList` in two ways:
 *
 *   1. **Privacy gate.** The component reads
 *      `useSocialListVisibility(targetUserId)` and renders
 *      `PrivacyRestrictedNotice` (TKT-6.2.F1) when
 *      `canViewFriends === false`. The data hook (`useFriends`) is
 *      NOT called in that branch — the privacy check fires before
 *      the SWR cache is touched.
 *
 *   2. **403 → privacy notice, not error state.** When the backend
 *      reports `SOCIAL_FRIEND_LIST_FORBIDDEN` (the friends list is
 *      private), the component renders `PrivacyRestrictedNotice`
 *      rather than `SocialListErrorState`. The error state would
 *      leak relationship state by calling attention to the failure.
 *
 * ## Why this design
 *
 * Phase 6 Risks line 49–54: the friends list is the most-leaked
 * surface in the social graph (blockers, non-mutual viewers, etc.).
 * Routing the privacy failure through the same `PrivacyRestrictedNotice`
 * component as the friends-only case makes the two cases
 * indistinguishable from the outside.
 */

import { type ReactElement, useEffect, useRef } from "react";

import { useFriends } from "@/features/social/hooks/useFriends";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";
import { useSocialListUrlState } from "@/features/social/hooks/useSocialListUrlState";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import type { ApiError } from "@/lib/api";

import { publishSocialListLoaded } from "@/lib/social/social-list-loaded-broadcast-channel";
import { addSocialListBreadcrumb } from "@/lib/social/social-search-sentry";

import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";

interface FriendsListProps {
  targetUserId: string;
  viewerIsOwner: boolean;
}

// Codes that should render the privacy notice rather than the error
// state. The list is intentionally short: any future code that
// signals "the friends list is private to the user" should be added
// here.
const FRIENDS_LIST_FORBIDDEN_CODES = new Set<string>([
  "SOCIAL_FRIEND_LIST_FORBIDDEN",
  "GLOBAL_FORBIDDEN",
]);

function isForbiddenError(error: ApiError | null): boolean {
  if (error === null) return false;
  if (typeof error.code === "string" && FRIENDS_LIST_FORBIDDEN_CODES.has(error.code)) {
    return true;
  }
  return error.status === 403;
}

export function FriendsList(props: FriendsListProps): ReactElement {
  const { targetUserId, viewerIsOwner } = props;

  // Hooks must be called unconditionally. The visibility check
  // decides which JSX subtree to render further down; the data
  // hooks are pure SWR cache readers that return the documented
  // safe fallback when the visibility check fails (the SWR key
  // factory short-circuits to `null` when the visibility is false).
  const visibility = useSocialListVisibility(targetUserId);

  const urlState = useSocialListUrlState(targetUserId);
  const { reset } = urlState;

  useSocialListLifecycleReset({ targetUserId, reset });

  const { users, isLoading, isStale, hasMore, loadMore, error, retry } =
    useFriends(targetUserId);

  // TKT-6.2.H2 — emit a single `social:6.2` breadcrumb per fetch
  // transition. We skip the privacy-gated branches (no fetch was
  // performed) so the breadcrumb shape stays consistent with the
  // /social/users/{id}/friends route even when the endpoint is
  // unreachable.
  const prevFetchStateRef = useRef<"loading" | "done" | "error">(
    isLoading ? "loading" : error !== null ? "error" : "done",
  );
  useEffect(() => {
    if (!visibility.canViewFriends) return;
    const next: "loading" | "done" | "error" = isLoading
      ? "loading"
      : error !== null
        ? "error"
        : "done";
    if (prevFetchStateRef.current === next) return;
    prevFetchStateRef.current = next;
    addSocialListBreadcrumb({
      kind: "friends",
      targetUserId,
      offset: urlState.cursor !== null ? Number(urlState.cursor) : 0,
      limit: urlState.limit,
      total: users.length,
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [
    visibility.canViewFriends,
    isLoading,
    error,
    targetUserId,
    urlState.cursor,
    urlState.limit,
    users.length,
  ]);

  // TKT-6.2.G2 — emit `list.loaded` after a successful load-more
  // so the counts badge can revalidate.
  const handleLoadMore = (): void => {
    loadMore();
    publishSocialListLoaded({
      kind: "friends",
      targetUserId,
      offset: users.length,
      limit: urlState.limit,
    });
  };

  // 1. Privacy gate: render the notice before the data hook fires.
  if (!visibility.canViewFriends) {
    return (
      <PrivacyRestrictedNotice
        variant="friends_only"
        resourceKind="friends"
      />
    );
  }

  // 2. 403 → privacy notice (not error state).
  if (isForbiddenError(error)) {
    return (
      <PrivacyRestrictedNotice
        variant="friends_only"
        resourceKind="friends"
      />
    );
  }

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
    return <SocialListEmptyState kind="friends" viewerIsOwner={viewerIsOwner} />;
  }

  return (
    <section
      data-testid="friends-list"
      aria-label="Friends"
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
          data-testid="friends-list-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
          Load more
        </button>
      )}
    </section>
  );
}