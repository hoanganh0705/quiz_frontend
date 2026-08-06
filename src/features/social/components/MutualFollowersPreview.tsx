"use client";

/**
 * `MutualFollowersPreview` — Profile-sidebar mutual-followers
 * preview surface for Story 6.4.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.E1.
 *
 * ## What this component owns
 *
 * The profile-sidebar mutual-followers preview. Mirrors
 * `MutualFriendsPreview` (same privacy gate, same skeleton
 * lifecycle, same overflow chip). Only the endpoint and the link
 * route differ:
 *
 *   - Endpoint:  `useMutualFollowers` (TKT-6.4.C3).
 *   - Route:     `/social/users/:id/mutual-followers`.
 *
 * The shared visibility / skeleton / mapping helpers live in
 * `mutual-preview.helpers` so the two preview components stay in
 * sync (any future tweak to the privacy-availability mapping or
 * the `canViewFriends`-style gate will catch both surfaces).
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { useMutualFollowers } from "@/features/social/hooks/useMutualFollowers";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import { MutualPreview } from "@/features/social/components/MutualPreview";
import { MutualPreviewSkeleton } from "@/features/social/components/MutualPreviewSkeleton";

import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

interface MutualFollowersPreviewProps {
  /** The target user id whose mutual followers are previewed. */
  targetUserId: string;
}

/**
 * Map the `useSocialListVisibility` (Epic 6.2) `canViewFriends`
 * flag to the `MutualPreviewVisibility` union. Same mapping as the
 * mutual-friends preview — the followers list shares the same
 * friends-only visibility rule.
 */
function toPreviewVisibility(
  canViewFriends: boolean,
  visibility: string,
): "visible" | "not_available" | "loading" {
  if (visibility !== "visible") return "not_available";
  if (!canViewFriends) return "not_available";
  return "visible";
}

/**
 * Project the `SocialMutualDto` rows from `useMutualFollowers` to
 * `SocialUserSummaryDto` for `MutualPreview`.
 */
function toSummaryDtos(
  items: readonly { user: SocialUserSummaryDto }[],
): readonly SocialUserSummaryDto[] {
  return items.map((item) => item.user);
}

/**
 * Render the mutual-followers preview.
 */
export function MutualFollowersPreview({
  targetUserId,
}: MutualFollowersPreviewProps): ReactElement {
  const visibilityFlags = useSocialListVisibility(targetUserId);
  const hook = useMutualFollowers(targetUserId);

  const previewVisibility = toPreviewVisibility(
    visibilityFlags.canViewFriends,
    hook.visibility,
  );

  if (hook.isLoading && hook.items.length === 0 && hook.visibility === "visible") {
    return <MutualPreviewSkeleton />;
  }

  const summaryDtos = toSummaryDtos(hook.items);
  const visible = summaryDtos.slice(0, MUTUAL_PREVIEW_CAP);

  return (
    <section
      aria-label="Mutual followers preview"
      data-testid="mutual-followers-preview"
      data-target-user-id={targetUserId}
      data-total={hook.total}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Mutual followers</h2>
        {hook.visibility === "visible" && hook.total > MUTUAL_PREVIEW_CAP && (
          <Link
            href={`/social/users/${encodeURIComponent(targetUserId)}/mutual-followers`}
            data-testid="mutual-followers-preview-see-all"
            className="text-xs text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            See all
          </Link>
        )}
      </div>
      <MutualPreview
        targetUserId={targetUserId}
        variant="followers"
        visibility={previewVisibility}
        mutuals={visible}
        total={hook.total}
      />
    </section>
  );
}
