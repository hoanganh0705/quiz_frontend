"use client";

/**
 * `SocialListEmptyState` — Empty-state component for the four list
 * pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.C3.
 *
 * ## What this component owns
 *
 * The empty-state copy for the four list kinds
 * (`followers` / `following` / `friends` / `blocked`), with one
 * branch per kind and a viewer-is-owner variant for the
 * `followers` copy ("No followers yet" vs. "This user has no
 * followers yet").
 *
 * ## Why this exists
 *
 * The cross-batch invariant for Story 6.2 is "Consistent list UX":
 * the empty state must use the same vocabulary across the four
 * routes. Centralising the copy here ensures every list surface
 * shows the same wording.
 *
 * ## Why a Client Component
 *
 * The component is purely presentational; marking it `"use client"`
 * is unnecessary but matches the convention of the other list
 * primitives (Skeleton, Row, Placeholder) so all four primitives
 * are interchangeable in the eventual list-page composition.
 */

import { type ReactElement } from "react";

import type { SocialListKind } from "./SocialListKind";

interface SocialListEmptyStateProps {
  /** The list kind the empty state represents. */
  kind: SocialListKind;
  /**
   * Whether the viewer is the owner of the list (i.e. the user the
   * list is conceptually about). Affects only the `followers` copy
   * — the other kinds are owner-agnostic.
   */
  viewerIsOwner: boolean;
}

interface EmptyCopy {
  readonly title: string;
  readonly body: string;
}

function copyFor(kind: SocialListKind, viewerIsOwner: boolean): EmptyCopy {
  switch (kind) {
    case "followers":
      return viewerIsOwner
        ? {
            title: "No followers yet",
            body: "When people follow you, they'll show up here.",
          }
        : {
            title: "No followers yet",
            body: "This user doesn't have any followers yet.",
          };
    case "following":
      return {
        title: "Not following anyone yet",
        body: "Follow other players to see their quiz activity here.",
      };
    case "friends":
      return {
        title: "No friends yet",
        body: "Send a friend request to start building your friends list.",
      };
    case "blocked":
      return {
        title: "No blocked users",
        body: "Users you block will appear here.",
      };
    default: {
      // Generic fallback for kinds not covered by the explicit
      // arms (e.g. the new `feed` kind, which has its own
      // `FeedEmptyState` for non-empty branches; new list kinds
      // will land here until the explicit arm is added).
      return {
        title: "Nothing here yet",
        body: "Check back soon.",
      };
    }
  }
}

/**
 * Render the empty-state copy for a list page.
 */
export function SocialListEmptyState({
  kind,
  viewerIsOwner,
}: SocialListEmptyStateProps): ReactElement {
  const copy = copyFor(kind, viewerIsOwner);
  return (
    <div
      data-testid={`social-list-empty-state-${kind}`}
      data-viewer-is-owner={viewerIsOwner ? "true" : "false"}
      role="status"
      aria-label={copy.title}
      className="flex flex-col items-center gap-2 p-6 text-center"
    >
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </div>
  );
}