"use client";

/**
 * `OutgoingRequestsListPage` — Page that lists the viewer's outgoing
 * friend requests.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E6.
 *
 * ## Purpose
 *
 * Renders the viewer's outgoing (sent) friend requests with a
 * coherent loading / empty / error / stale UX. Each row shows the
 * `FriendRequestItem` shared component with a "Cancel" trigger that
 * opens `FriendRequestCancelDialog` (TKT-6.8.E3) wired to the
 * request's `friendshipId`.
 *
 * ## Feature flag gating
 *
 * The list is gated by `social_relationship_live` (Epic 6.1 read
 * flag). The cancel actions are gated by
 * `social_friend_request_mutation_live` (TKT-6.8.B1).
 */

import {
  type ReactElement,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { FriendRequestCancelDialog } from "@/features/social/components/FriendRequestCancelDialog";
import { FriendRequestEmptyState } from "@/features/social/components/FriendRequestEmptyState";
import { FriendRequestItem } from "@/features/social/components/FriendRequestItem";
import { FriendRequestSkeleton } from "@/features/social/components/FriendRequestSkeleton";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import { useOutgoingRequests } from "@/features/social/hooks/useOutgoingRequests";

export interface OutgoingRequestsListPageProps {
  /** Optional override for testability. */
  readonly currentUserId?: string | null;
}

/**
 * List-page component for the viewer's outgoing friend requests.
 */
export function OutgoingRequestsListPage({
}: OutgoingRequestsListPageProps): ReactElement {
  // ── Read flag guard (no-op if 'placeholder') ───────────────────
  // All hooks are called unconditionally so the hook order is
  // stable across renders.
  const readFlag = getFeatureFlagValue("social_relationship_live");
  const isFlagPlaceholder = readFlag === "placeholder";

  // ── Read hook ───────────────────────────────────────────────────
  const { requests, isLoading, error, retry } = useOutgoingRequests();

  // Per-row dialog state. Tracks which `friendshipId` is currently
  // being cancelled (only one dialog at a time).
  const [openCancelForId, setOpenCancelForId] = useState<string | null>(null);

  if (isFlagPlaceholder) {
    return (
      <div data-testid="outgoing-requests-page-placeholder" className="p-6">
        <FriendRequestEmptyState kind="outgoing" />
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading && requests.length === 0) {
    return (
      <div data-testid="outgoing-requests-page-loading" className="p-2">
        <FriendRequestSkeleton count={5} />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (error !== null) {
    return (
      <div data-testid="outgoing-requests-page-error" className="p-2">
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
      <div data-testid="outgoing-requests-page-empty" className="p-6">
        <FriendRequestEmptyState kind="outgoing" />
      </div>
    );
  }

  // ── Populated ──────────────────────────────────────────────────
  return (
    <div
      data-testid="outgoing-requests-page"
      className="flex flex-col gap-2 p-4"
    >
      <header>
        <h1 className="text-lg font-semibold">Outgoing requests</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length} pending{" "}
          {requests.length === 1 ? "request" : "requests"}
        </p>
      </header>
      <ul role="list" className="flex flex-col gap-1">
        {requests.map((request) => (
          <li key={request.id}>
            <FriendRequestItem request={request}>
              {(ctx) => (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenCancelForId(ctx.friendshipId)}
                    data-testid="outgoing-requests-cancel"
                    aria-label={`Cancel request to ${request.requester.userName}`}
                  >
                    Cancel
                  </Button>
                  <FriendRequestCancelDialog
                    open={openCancelForId === ctx.friendshipId}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) setOpenCancelForId(null);
                    }}
                    friendshipId={ctx.friendshipId}
                    targetUserId={ctx.targetUserId}
                  />
                </>
              )}
            </FriendRequestItem>
          </li>
        ))}
      </ul>
    </div>
  );
}
