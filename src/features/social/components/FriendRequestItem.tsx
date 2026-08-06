"use client";

/**
 * `FriendRequestItem` — Shared list row component for both
 * `IncomingRequestsListPage` and `OutgoingRequestsListPage`.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E7.
 *
 * ## What this component owns
 *
 * The shared row layout for incoming and outgoing friend-request list
 * pages. The component:
 *
 *   - Renders the requester / recipient avatar, name, and sent-at
 *     timestamp using the `SocialListRow` primitive
 *     (Epic 6.2 / TKT-6.2.C1).
 *   - Renders a per-item action slot via a render prop that
 *     receives `actionContext` (containing the unstable
 *     `friendshipId` and the stable `targetUserId`). The parent
 *     passes the slot renderer (`FriendRequestRespondActions` for
 *     incoming, a "Cancel" trigger for outgoing).
 *   - Does NOT persist `friendshipId` in any URL, localStorage,
 *     sessionStorage, or analytics payload (cross-batch invariant).
 *
 * ## `friendshipId` hygiene
 *
 * The `friendshipId` is consumed ONLY as an in-memory argument
 * forwarded to the action slot via the render-prop's
 * `actionContext.friendshipId`. It is NEVER:
 *   - persisted in SWR cache keys,
 *   - written to `localStorage` / `sessionStorage`,
 *   - appended to a URL or `window.history.pushState`,
 *   - logged to Sentry.
 *
 * The row link target is `/users/:userId` only (per the
 * `SocialListRow` primitive's invariant) — the navigation
 * analytics event emits `userId` only.
 */

import {
  type ReactElement,
  type ReactNode,
} from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { SocialFriendRequestDto } from "@/features/social/types";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Payload exposed to the per-item action slot via
 * `actionContext.friendshipId` and `actionContext.targetUserId`. The
 * action slot forwards the friendshipId to the respond / cancel hook
 * for in-memory use.
 */
export interface FriendRequestItemActionContext {
  /** The unstable internal id of the friend request. */
  readonly friendshipId: string;
  /** The target user's stable identifier. */
  readonly targetUserId: string;
  /** The full DTO — for callers that need more than the ids. */
  readonly request: SocialFriendRequestDto;
}

export interface FriendRequestItemProps {
  /**
   * The friend-request DTO. The `requester` field carries the avatar,
   * userName, and displayName; `requesterId` is the stable user id;
   * `createdAt` is the sent-at timestamp; `id` is the
   * `friendshipId` (unstable internal id).
   */
  readonly request: SocialFriendRequestDto;
  /**
   * The per-item action slot. The parent page passes the
   * `FriendRequestRespondActions` component for incoming requests,
   * or a "Cancel" trigger for outgoing requests. The slot receives
   * `actionContext` via this render prop so the slot can call the
   * respond / cancel hooks with the correct ids.
   */
  readonly children: (
    actionContext: FriendRequestItemActionContext,
  ) => ReactNode;
  /** Optional CSS class override for the row's outer wrapper. */
  readonly className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Render a relative time string (e.g. "3 days ago") from an ISO
 * timestamp. Pure function. The granularity is capped at "days" to
 * keep the copy legible.
 */
function formatRelativeSentAt(iso: string): string {
  const sent = new Date(iso).getTime();
  if (Number.isNaN(sent)) return "";
  const deltaMs = Date.now() - sent;
  if (deltaMs < 0) return "just now";
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Render a single friend-request row.
 *
 * The action slot is a render-prop function `(ctx) => ReactNode` so
 * the parent can decide whether to render
 * `FriendRequestRespondActions` (incoming) or a Cancel trigger
 * (outgoing). The component itself never imports
 * `useRespondFriendRequest` or `useCancelFriendRequest` — those live
 * in the per-item action components (TKT-6.8.E3).
 */
export function FriendRequestItem({
  request,
  children,
  className,
}: FriendRequestItemProps): ReactElement {
  const sentAt = formatRelativeSentAt(request.createdAt);
  const requester = request.requester;

  return (
    <div
      data-testid="friend-request-item"
      data-friendship-id={request.id}
      data-target-user-id={requester.userId}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Avatar>
        {requester.avatarUrl !== null && (
          <AvatarImage
            src={requester.avatarUrl}
            alt={`${requester.userName}'s avatar`}
          />
        )}
        <AvatarFallback>
          {requester.userName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col">
        <span className="font-medium leading-none">{requester.userName}</span>
        {requester.displayName !== null && (
          <span className="text-sm text-muted-foreground">
            {requester.displayName}
          </span>
        )}
      </div>

      <span className="text-sm text-muted-foreground">{sentAt}</span>

      <div className="ml-2 flex items-center gap-2">
        {children({
          friendshipId: request.id,
          targetUserId: request.requesterId,
          request,
        })}
      </div>
    </div>
  );
}
