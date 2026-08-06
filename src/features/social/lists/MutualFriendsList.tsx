"use client";

/**
 * `MutualFriendsList` — Full-list page for the viewer ↔ target
 * mutual-friends surface (Story 6.4).
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.E2.
 *
 * ## What this component owns
 *
 * The full-list surface for the mutual-friends route
 * (`/social/users/:id/mutual-friends`). The component composes:
 *
 *   - `useMutualFriends(targetUserId)` (TKT-6.4.C2) for the data.
 *   - `MutualListSkeleton` (TKT-6.4.B3) for the loading state.
 *   - `MutualEmptyState` (TKT-6.4.B4) for the empty branch.
 *   - `MutualErrorState` (TKT-6.4.B4) for the error branch.
 *   - `SocialListRow` (Epic 6.2 / TKT-6.2.C1) for each row.
 *   - `BlockedContentGate` (Epic 6.1) wrapping the row list so cached
 *     rows from a blocked user disappear after revalidation.
 *
 * The rendered flow:
 *
 * ```
 *   visibility !== 'visible' → PrivacyRestrictedNotice
 *   visibility === 'visible' && isLoading && items.length === 0 → MutualListSkeleton
 *   visibility === 'visible' && error !== null && items.length === 0 → MutualErrorState
 *   visibility === 'visible' && items.length === 0 → MutualEmptyState
 *   visibility === 'visible' && items.length > 0   → list of SocialListRow + load-more
 * ```
 *
 * ## Privacy
 *
 * Privacy branches render `PrivacyRestrictedNotice` (Epic 6.2 /
 * TKT-6.2.F1). No list / row is rendered for non-visible viewers.
 *
 * ## No optimistic updates
 *
 * The page reads SWR via the hook. There are no local state cells
 * for "currently displayed mutuals" — a revalidation replaces the
 * rows in the same render.
 *
 * ## SSR-safety
 *
 * The component is `"use client"` because the hook reads the SWR
 * cache. The static branches (skeleton, empty, error, privacy
 * notice) render identically on the server until the client takes
 * over.
 */

import { type ReactElement } from "react";

import { useMutualFriends } from "@/features/social/hooks/useMutualFriends";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { MutualEmptyState } from "@/features/social/components/MutualEmptyState";
import { MutualErrorState } from "@/features/social/components/MutualErrorState";
import { MutualListSkeleton } from "@/features/social/components/MutualListSkeleton";
import {
  PrivacyRestrictedNotice,
  type PrivacyRestrictedNoticeVariant,
} from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialListRow } from "@/features/social/components/SocialListRow";

import type { SocialMutualDto, SocialUserSummaryDto } from "@/features/social/types";

// ─── Public surface ──────────────────────────────────────────────────────

interface MutualFriendsListProps {
  /** The target user id whose mutual friends are being listed. */
  targetUserId: string;
}

/**
 * Map the hook's `SocialListVisibility` to the `PrivacyRestrictedNotice`
 * variant. The mapping is intentionally narrow — only the documented
 * three privacy branches surface here. An unknown visibility is
 * treated as `'not_available'` (the safe default).
 */
function toPrivacyVariant(
  visibility: string,
): PrivacyRestrictedNoticeVariant {
  if (visibility === "private") return "friends_only";
  return "not_available";
}

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Render the full mutual-friends list page.
 */
export function MutualFriendsList({
  targetUserId,
}: MutualFriendsListProps): ReactElement {
  const {
    items,
    total,
    visibility,
    isLoading,
    error,
    hasMore,
    loadMore,
    retry,
  } = useMutualFriends(targetUserId);

  // Privacy branch — render the privacy notice; no list.
  if (visibility !== "visible") {
    return (
      <PrivacyRestrictedNotice
        variant={toPrivacyVariant(visibility)}
        resourceKind="friends"
      />
    );
  }

  // Loading skeleton — only when no cached rows are present (the
  // skeleton must not pop over already-visible rows).
  if (isLoading && items.length === 0) {
    return <MutualListSkeleton />;
  }

  // Error state — only when there are no cached rows.
  if (error !== null && items.length === 0) {
    return (
      <MutualErrorState
        error={error}
        onRetry={() => {
          void retry();
        }}
      />
    );
  }

  // Empty branch — visible with no rows.
  if (items.length === 0) {
    return <MutualEmptyState variant="friends" />;
  }

  // Populated branch — list rows, pagination footer.
  return (
    <BlockedContentGate targetUserId={targetUserId}>
      <section
        aria-label="Mutual friends"
        data-testid="mutual-friends-list"
        data-target-user-id={targetUserId}
        data-total={total}
        className="flex flex-col gap-2"
      >
        <h1 className="text-lg font-semibold">Mutual friends</h1>
        <ul className="flex flex-col gap-1">
          {items.map((item: SocialMutualDto) => (
            <li
              key={item.id}
              data-testid="mutual-friends-list-row"
              data-mutual-id={item.id}
              data-user-id={item.user.userId}
            >
              <SocialListRow
                user={item.user as SocialUserSummaryDto}
                variant="summary"
              />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            onClick={() => loadMore()}
            data-testid="mutual-friends-list-load-more"
            className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Load more
          </button>
        )}
      </section>
    </BlockedContentGate>
  );
}
