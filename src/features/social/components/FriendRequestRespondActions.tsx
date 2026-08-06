"use client";

/**
 * `FriendRequestRespondActions` — In-place popover for accepting or
 * declining a friend request.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E3.
 *
 * ## Purpose
 *
 * Renders an in-place popover with two buttons: "Accept" and
 * "Decline". On click, the component calls
 * `useRespondFriendRequest` from TKT-6.8.D2 with the appropriate
 * action.
 *
 * The popover is rendered inline next to the requester row (no
 * modal / dialog) so the user can scan the list and triage multiple
 * incoming requests without losing context.
 *
 * ## Dismissal
 *
 * The component is "controlled" via the parent — the parent decides
 * when to render the popover by setting `open` to `true`. On a
 * successful mutation, the parent should call `onOpenChange(false)`
 * to dismiss the popover. The component will invoke
 * `onOpenChange(false)` itself on a successful accept/decline.
 *
 * ## `friendshipId` hygiene
 *
 * The `friendshipId` is consumed ONLY as an in-memory prop and
 * forwarded to `useRespondFriendRequest` for use as a path parameter.
 * It is NEVER:
 *   - persisted in SWR cache keys,
 *   - written to `localStorage` / `sessionStorage`,
 *   - appended to a URL,
 *   - logged to Sentry.
 */

import { type ReactElement } from "react";

import { Button } from "@/components/ui/Button";

import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { useRespondFriendRequest } from "@/features/social/hooks/useRespondFriendRequest";

export interface FriendRequestRespondActionsProps {
  /**
   * The target user's stable identifier. The hook needs this to
   * derive the permission flag and the SWR cache keys to invalidate.
   */
  readonly targetUserId: string;
  /**
   * The unstable internal id of the friend request.
   */
  readonly friendshipId: string;
  /**
   * Whether the popover is open.
   */
  readonly open: boolean;
  /**
   * Called when the popover requests a state change. Used by the
   * parent to show / hide the popover.
   */
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Inline accept / decline popover for an incoming friend request.
 */
export function FriendRequestRespondActions({
  targetUserId,
  friendshipId,
  open,
  onOpenChange,
}: FriendRequestRespondActionsProps): ReactElement | null {
  const { respond, isPending, error } = useRespondFriendRequest(targetUserId);

  if (!open) {
    return null;
  }

  // Defensive empty state — the parent should not open the popover
  // without a friendshipId, but if it does, we render nothing.
  if (typeof friendshipId !== "string" || friendshipId.length === 0) {
    return null;
  }

  const handleAccept = () => {
    respond({ friendshipId, action: "accept" });
    // The hook will trigger the SWR revalidation. The parent owns
    // the dismissal — on success, the row is removed from the
    // incoming list.
    onOpenChange(false);
  };

  const handleDecline = () => {
    respond({ friendshipId, action: "decline" });
    onOpenChange(false);
  };

  return (
    <div
      data-testid="friend-request-respond-actions"
      data-friendship-id={friendshipId}
      data-target-user-id={targetUserId}
      role="group"
      aria-label="Respond to friend request"
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleAccept}
          disabled={isPending}
          data-testid="friend-request-respond-accept"
          aria-label="Accept friend request"
        >
          Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isPending}
          data-testid="friend-request-respond-decline"
          aria-label="Decline friend request"
        >
          Decline
        </Button>
      </div>
      {error !== null && (
        <FriendRequestErrorBanner error={error} onAction={handleAccept} />
      )}
    </div>
  );
}
