"use client";

/**
 * `FriendRequestEmptyState` — Shared empty state for both list pages.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E9.
 *
 * The component renders distinct copy for incoming vs. outgoing
 * requests. The `kind` discriminator is exposed as a typed prop so
 * future additions (e.g. `kind: "accepted"`) can extend the union
 * with a TypeScript exhaustiveness check.
 */

import { type ReactElement } from "react";

export type FriendRequestEmptyStateKind = "incoming" | "outgoing";

export interface FriendRequestEmptyStateProps {
  /** The kind of list this empty state represents. */
  readonly kind: FriendRequestEmptyStateKind;
}

interface EmptyCopy {
  readonly title: string;
  readonly body: string;
  readonly iconKind: "inbox" | "send";
}

function copyFor(kind: FriendRequestEmptyStateKind): EmptyCopy {
  switch (kind) {
    case "incoming":
      return {
        title: "No incoming requests",
        body: "When someone sends you a friend request, it'll show up here.",
        iconKind: "inbox",
      };
    case "outgoing":
      return {
        title: "No outgoing requests",
        body: "Friend requests you send will show up here until the recipient responds.",
        iconKind: "send",
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Render the empty-state for either friend-request list page.
 */
export function FriendRequestEmptyState({
  kind,
}: FriendRequestEmptyStateProps): ReactElement {
  const copy = copyFor(kind);
  return (
    <div
      data-testid={`friend-request-empty-state-${kind}`}
      role="status"
      aria-label={copy.title}
      className="flex flex-col items-center gap-2 p-6 text-center"
    >
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </div>
  );
}
