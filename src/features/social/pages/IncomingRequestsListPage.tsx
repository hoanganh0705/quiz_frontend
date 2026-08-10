"use client";

/**
 * `IncomingRequestsListPage` — Page that lists the viewer's incoming
 * friend requests.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E5.
 *
 * ## Purpose
 *
 * Renders the viewer's incoming friend requests with a coherent
 * loading / empty / error / stale UX. Each row shows the
 * `FriendRequestItem` shared component, with
 * `FriendRequestRespondActions` (TKT-6.8.E3) wired to the request's
 * `friendshipId` so the user can accept / decline inline.
 *
 * ## Feature flag gating
 *
 * The list is gated by `social_relationship_live` (Epic 6.1 read
 * flag). The respond actions are gated by
 * `social_friend_request_mutation_live` (TKT-6.8.B1).
 */

import { type ReactElement } from "react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { FriendRequestEmptyState } from "@/features/social/components/FriendRequestEmptyState";
import { FriendRequestItem } from "@/features/social/components/FriendRequestItem";
import { FriendRequestSkeleton } from "@/features/social/components/FriendRequestSkeleton";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import { useIncomingRequests } from "@/features/social/hooks/useIncomingRequests";

export interface IncomingRequestsListPageProps {
  /** Optional override for testability. */
  readonly currentUserId?: string | null;
}

/**
 * List-page component for the viewer's incoming friend requests.
 */
export function IncomingRequestsListPage({
}: IncomingRequestsListPageProps): ReactElement {
  // ── Read flag guard (no-op if 'placeholder') ───────────────────
  // The call to useIncomingRequests is unconditional so the
  // hook order is stable across renders.
  const readFlag = getFeatureFlagValue("social_relationship_live");
  const isFlagPlaceholder = readFlag === "placeholder";

  // ── Read hook ───────────────────────────────────────────────────
  const { requests, isLoading, error, retry } = useIncomingRequests();

  if (isFlagPlaceholder) {
    return (
      <div data-testid="incoming-requests-page-placeholder" className="p-6">
        <FriendRequestEmptyState kind="incoming" />
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading && requests.length === 0) {
    return (
      <div data-testid="incoming-requests-page-loading" className="p-2">
        <FriendRequestSkeleton count={5} />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (error !== null) {
    return (
      <div data-testid="incoming-requests-page-error" className="p-2">
        <SocialListErrorState
          error={error}
          isStale={false}
          onRetry={() => {
            void retry();
          }}
        />
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────
  if (requests.length === 0) {
    return (
      <div data-testid="incoming-requests-page-empty" className="p-6">
        <FriendRequestEmptyState kind="incoming" />
      </div>
    );
  }

  // ── Populated ──────────────────────────────────────────────────
  return (
    <div data-testid="incoming-requests-page" className="flex flex-col gap-2 p-4">
      <header>
        <h1 className="text-lg font-semibold">Incoming requests</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length} pending{" "}
          {requests.length === 1 ? "request" : "requests"}
        </p>
      </header>
      <ul role="list" className="flex flex-col gap-1">
        {requests.map((request) => (
          <li key={request.id}>
            <FriendRequestItem request={request}>
              {/* The action slot for incoming rows is a no-op markup
                  placeholder — the actual inline Accept / Decline
                  buttons are rendered by the per-row
                  `FriendRequestCta` (TKT-6.8.E2) on the requester's
                  profile page, NOT in this list view. The list
                  view does not show per-row respond actions
                  because Epic 6.8 keeps the list read-only for
                  navigation simplicity; mutation entry points
                  live on the per-user profile CTA. The render-prop
                  is preserved for symmetry with `FriendRequestItem`
                  but is intentionally a no-op here. */}
              {() => null}
            </FriendRequestItem>
          </li>
        ))}
      </ul>
    </div>
  );
}
