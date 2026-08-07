"use client";

/**
 * `SocialFeedItem` — Shared row primitive for the Story 6.9
 * global social feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E3.
 *
 * ## What this component owns
 *
 * The single visual vocabulary for a single feed row. The component
 * composes:
 *
 *   - The actor's avatar (`Avatar` + `AvatarImage` + `AvatarFallback`).
 *   - The actor's username / display name.
 *   - The item's `at` timestamp rendered via the shared
 *     `formatRelativeTime` utility.
 *   - The `FeedItemRenderer` dispatcher (TKT-6.9.E1) for the
 *     type-specific copy.
 *   - A `BlockedContentGate` wrapper (Epic 6.2 / TKT-6.2.D2) so
 *     cached items owned by a blocked user disappear after the
 *     relationship SWR key revalidates.
 *
 * ## Why a Client Component
 *
 * The `BlockedContentGate` reads the viewer's `Relationship`
 * projection via SWR (Epic 6.2 / TKT-6.2.D2), which is a client
 * primitive. The row is otherwise presentational.
 *
 * ## Blocked-content gating
 *
 * The row wraps its content in `BlockedContentGate` with
 * `targetUserId={item.actorUser.userId}`. When the viewer has
 * blocked the actor (or is blocked by the actor), the gate
 * returns its fallback and the row disappears.
 *
 * ## Why no profile link
 *
 * The feed row is per-item, not per-actor. The existing
 * `SocialListRow` pattern (Epic 6.2) is for profile lists where
 * the entire row is the actor's identity; the feed row's identity
 * is the item (a quiz completion, a tournament win, …). Linking
 * the row to the actor's profile would compete with the item's
 * own copy and link target. The row is intentionally non-link.
 *
 * ## Why no analytics
 *
 * The story is read-only rendering. The `BlockedContentGate`
 * already emits the `Relationship` query; the row does not
 * double-count.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API at render time. The `BlockedContentGate`'s
 * SWR read is hydration-safe.
 */

import { type ReactElement } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { FeedItemRenderer } from "@/features/social/components/FeedItemRenderer";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { formatRelativeTime } from "@/shared/utils/date-utils";

export interface SocialFeedItemProps {
  /**
   * The feed item to render. The full projection (id, type, at,
   * actorUser, payload) is passed through to the dispatcher.
   */
  readonly item: SocialFeedItemDto;
  /**
   * The viewer's user id. Currently unused at the row level (the
   * `BlockedContentGate` is the canonical owner) but accepted so
   * the eventual live surface can pass the viewer context without
   * a refactor.
   */
  readonly viewerUserId: string;
}

/**
 * Render a single feed row. The row composes the actor's avatar,
 * username, the item's timestamp, and the `FeedItemRenderer`
 * dispatcher output, all wrapped in a `BlockedContentGate` so
 * cached items owned by a blocked user disappear when the
 * relationship SWR key revalidates.
 */
export function SocialFeedItem({
  item,
  viewerUserId,
}: SocialFeedItemProps): ReactElement {
  // The `viewerUserId` is accepted for parity with the future live
  // surface. It is intentionally unused at the row level — the
  // `BlockedContentGate` is the canonical owner of the
  // viewer-target relationship.
  void viewerUserId;

  const actor = item.actorUser;
  const timestampCopy = formatRelativeTime(item.at);

  return (
    <BlockedContentGate targetUserId={actor.userId}>
      <article
        data-testid="social-feed-item"
        data-item-id={item.id}
        data-item-type={item.type}
        data-actor-id={actor.userId}
        className="flex items-start gap-3 p-3 rounded-md border border-border"
      >
        <Avatar className="size-10 shrink-0">
          {actor.avatarUrl !== null ? (
            <AvatarImage
              src={actor.avatarUrl}
              alt={`${actor.userName}'s avatar`}
            />
          ) : null}
          <AvatarFallback aria-hidden="true">
            {actor.userName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium truncate">{actor.userName}</p>
            <time
              dateTime={item.at}
              className="text-xs text-muted-foreground shrink-0"
              data-testid="social-feed-item-timestamp"
            >
              {timestampCopy}
            </time>
          </div>
          <div className="text-sm">
            <FeedItemRenderer item={item} viewerUserId={viewerUserId} />
          </div>
        </div>
      </article>
    </BlockedContentGate>
  );
}