"use client";

/**
 * `MutualFriendsPreview` — Profile-sidebar mutual-friends preview
 * surface for Story 6.4.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.E1.
 *
 * ## What this component owns
 *
 * The profile-sidebar mutual-friends preview. The component:
 *
 *   - Derives visibility from `useSocialListVisibility(targetUserId)`
 *     (Epic 6.2 / TKT-6.2.D2) and forwards it to `MutualPreview`
 *     (TKT-6.4.B1). Non-visible viewers see the privacy notice (no
 *     avatars leak).
 *   - Reads the first page of `useMutualFriends(targetUserId)`
 *     (TKT-6.4.C2). The preview surface uses the hook's first page
 *     directly — no separate preview endpoint is required because
 *     the hook's pagination is keyed on `targetUserId` and the first
 *     page is the preview cap.
 *   - Shows `MutualPreviewSkeleton` (TKT-6.4.B3) while the hook is
 *     loading and there are no cached items.
 *   - Renders the overflow chip (`+N more`) when `total` exceeds
 *     the visible count.
 *   - Links to the full-list page
 *     (`/social/users/:id/mutual-friends`) so the user can drill
 *     into the full list. The link target uses `encodeURIComponent`
 *     on `userId` — no internal-id leakage.
 *
 * ## Privacy-aware rendering
 *
 * The component reads `useSocialListVisibility` (the Epic 6.2
 * selector) and forwards its decision to `MutualPreview`. The
 * selector is the single source of truth — the preview never makes
 * its own visibility decision. The privacy notice uses the
 * `PrivacyRestrictedNotice` primitive so the copy never leaks
 * relationship state.
 *
 * ## No optimistic updates
 *
 * The preview always reads the SWR cache via the hook. There is no
 * `useState` for "currently displayed mutuals" so a revalidation
 * (e.g. after a privacy decision flips) replaces the rows in the
 * same render.
 *
 * ## SSR-safety
 *
 * The component reads no `window` / `localStorage`. The SWR reads
 * are client-only, but the loading skeleton renders identically on
 * the server until the client takes over.
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { useMutualFriends } from "@/features/social/hooks/useMutualFriends";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import { MutualPreview } from "@/features/social/components/MutualPreview";
import { MutualPreviewSkeleton } from "@/features/social/components/MutualPreviewSkeleton";

import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

interface MutualFriendsPreviewProps {
  /** The target user id whose mutual friends are previewed. */
  targetUserId: string;
}

/**
 * Map the `useSocialListVisibility` (Epic 6.2) `canViewFriends`
 * flag to the `MutualPreviewVisibility` union. Visible → `'visible'`.
 * Not visible → `'not_available'`. (`canViewFriends` is the strict
 * gate; the dedicated privacy branches come from the hook's
 * `visibility` field.)
 */
function toPreviewVisibility(
  canViewFriends: boolean,
  visibility: string,
): "visible" | "not_available" | "loading" {
  // The hook surfaces `visibility: 'not_found'` for `SOCIAL_USER_NOT_FOUND`
  // and `visibility: 'private'` for `SOCIAL_FRIEND_LIST_FORBIDDEN` —
  // both should fall back to the privacy notice.
  if (visibility !== "visible") return "not_available";
  if (!canViewFriends) return "not_available";
  return "visible";
}

/**
 * Project the `SocialMutualDto` rows from `useMutualFriends` to the
 * `SocialUserSummaryDto` shape `MutualPreview` consumes.
 *
 * The hook's items are `SocialMutualDto[]` (`{ id, user: SocialUserSummaryDto, ... }`).
 * The preview needs the `SocialUserSummaryDto[]` projection so it can
 * hand the rows to `MutualPreview` without leaking the mutual-count
 * fields it does not render.
 */
function toSummaryDtos(
  items: readonly { user: SocialUserSummaryDto }[],
): readonly SocialUserSummaryDto[] {
  return items.map((item) => item.user);
}

/**
 * Render the mutual-friends preview.
 */
export function MutualFriendsPreview({
  targetUserId,
}: MutualFriendsPreviewProps): ReactElement {
  const visibilityFlags = useSocialListVisibility(targetUserId);
  const hook = useMutualFriends(targetUserId);

  // The hook already enforces privacy-aware visibility; we forward
  // its decision to `MutualPreview`. The `useSocialListVisibility`
  // selector is the secondary guard that hides the preview entirely
  // when the friendship-list is not permitted (the owner or a
  // mutual friend is the documented gate).
  const previewVisibility = toPreviewVisibility(
    visibilityFlags.canViewFriends,
    hook.visibility,
  );

  // Loading skeleton — when the hook is loading and there are no
  // cached rows, render the skeleton instead of the empty branch.
  if (hook.isLoading && hook.items.length === 0 && hook.visibility === "visible") {
    return <MutualPreviewSkeleton />;
  }

  const summaryDtos = toSummaryDtos(hook.items);
  const visible = summaryDtos.slice(0, MUTUAL_PREVIEW_CAP);

  return (
    <section
      aria-label="Mutual friends preview"
      data-testid="mutual-friends-preview"
      data-target-user-id={targetUserId}
      data-total={hook.total}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Mutual friends</h2>
        {hook.visibility === "visible" && hook.total > MUTUAL_PREVIEW_CAP && (
          <Link
            href={`/social/users/${encodeURIComponent(targetUserId)}/mutual-friends`}
            data-testid="mutual-friends-preview-see-all"
            className="text-xs text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            See all
          </Link>
        )}
      </div>
      <MutualPreview
        targetUserId={targetUserId}
        variant="friends"
        visibility={previewVisibility}
        mutuals={visible}
        total={hook.total}
      />
    </section>
  );
}
