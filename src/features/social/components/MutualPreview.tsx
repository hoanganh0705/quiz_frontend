"use client";

/**
 * `MutualPreview` — Horizontal avatar row with overflow indicator
 * for the Story 6.4 mutual-friends / mutual-followers surfaces.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.B1.
 *
 * ## What this component owns
 *
 * The single visual vocabulary for the mutual preview surface
 * (rendered in the profile sidebar and at the top of the mutual
 * list pages). The component:
 *
 *   - Renders up to `MUTUAL_PREVIEW_CAP` avatars (the documented
 *     server-side preview cap; see `mutual-count-invariants.ts`).
 *   - When the `total` exceeds the visible count, renders a
 *     trailing "+N more" indicator derived from
 *     `mutualCountOverflow(visible, total)` (the documented
 *     helper; no other file is permitted to compute the overflow
 *     indicator ad-hoc).
 *   - Is privacy-aware: when `visibility !== 'visible'`, renders
 *     `PrivacyRestrictedNotice` (Epic 6.2 / TKT-6.2.F1) instead
 *     of avatars. The notice does not leak relationship state.
 *
 * Each avatar links to `/users/:userId` via the same href pattern
 * Story 6.2 established (`encodeURIComponent(userId)`; no
 * internal-id leakage).
 *
 * ## Why static-rendered
 *
 * The component is marked `"use client"` because the avatar
 * component (`@/components/ui/Avatar`) is a client primitive built
 * on Radix. The component itself is purely presentational; it
 * does not call any hook or service.
 *
 * ## Variant
 *
 * Two variants — `'friends'` and `'followers'` — control the
 * privacy-notice copy and the `data-testid`. The variant is the
 * single source of truth for which mutual surface is being
 * previewed; downstream tests assert the variant-appropriate
 * notice.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components
 * and from the App Router's route modules.
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import type { SocialListKind } from "@/features/social/components/SocialListKind";
import {
  MUTUAL_PREVIEW_CAP,
  mutualCountOverflow,
} from "@/features/social/mutual-count-invariants";
import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

/**
 * The visibility union the mutual preview accepts. The shape
 * mirrors the four documented `useSocialListVisibility` flags
 * (any of which pass / fail the visibility check) plus `'loading'`
 * for the initial SWR load.
 *
 * The component treats `visibility !== 'visible'` as a privacy
 * gate — the privacy notice is rendered with the variant-appropriate
 * copy and no avatars are rendered. The notice itself never
 * surfaces relationship state (the privacy boundary is the whole
 * point), so the union is not exposed to the screen reader.
 */
export type MutualPreviewVisibility =
  | "visible"
  | "not_available"
  | "friends_only"
  | "auth_required"
  | "loading";

export type MutualPreviewKind = "friends" | "followers";

interface MutualPreviewProps {
  /**
   * The target user id the preview is conceptually about. The id
   * is not surfaced in the avatar-row copy; it is accepted so the
   * call-site is type-compatible with the eventual live mutual
   * surfaces.
   */
  targetUserId: string;
  /**
   * The mutual kind — `'friends'` for mutual-friends previews,
   * `'followers'` for mutual-followers previews. Drives the
   * privacy-notice copy and the `data-testid`.
   */
  variant: MutualPreviewKind;
  /**
   * The visibility decision computed by the caller via
   * `useSocialListVisibility`. The component treats
   * `visibility !== 'visible'` as a privacy gate.
   */
  visibility: MutualPreviewVisibility;
  /**
   * The mutual rows to render. Each row carries a `SocialUserSummaryDto`
   * (`{ id, userId, userName, displayName, avatarUrl, ... }`). The
   * array is `readonly` so the call-site cannot mutate the SWR
   * cache.
   */
  mutuals: readonly SocialUserSummaryDto[];
  /**
   * The total number of mutual connections the backend reports
   * (the server-authoritative count). The component derives the
   * "+N more" indicator from this value via
   * `mutualCountOverflow`. When `total` is omitted, the
   * indicator is hidden (the UI cannot claim an overflow count
   * without a server authoritative total).
   */
  total?: number;
  /**
   * Optional CSS class override on the root element.
   */
  className?: string;
}

/**
 * Map the preview variant to the `SocialListKind` privacy-notice
 * resource kind. The mapping keeps the privacy notice prop
 * sets the documented list kinds.
 */
function resourceKindFor(variant: MutualPreviewKind): SocialListKind {
  return variant === "friends" ? "friends" : "followers";
}

/**
 * Privacy-blocking visibility values. The values are the union
 * members that render `PrivacyRestrictedNotice`. `'loading'` is
 * treated as blocked because the caller has not yet resolved
 * visibility — the safe default is the privacy notice so we
 * never leak avatars before the server-derived decision arrives.
 */
const PRIVACY_BLOCKING: ReadonlySet<MutualPreviewVisibility> = new Set([
  "not_available",
  "friends_only",
  "auth_required",
  "loading",
]);

/**
 * Per-variant empty copy. The copy is intentionally generic —
 * the variant selector never leaks more than "no mutuals".
 */
const EMPTY_COPY: Record<MutualPreviewKind, string> = {
  friends: "No mutual friends",
  followers: "No mutual followers",
};

/**
 * Render the horizontal avatar-row preview for the mutual
 * surfaces.
 *
 * Privacy-aware: when `visibility !== 'visible'`, renders
 * `PrivacyRestrictedNotice` (the Epic 6.2 primitive) with the
 * variant-appropriate copy. The privacy notice has the same
 * `aria-label` shape used by the other list surfaces so screen
 * readers announce the privacy state uniformly.
 */
export function MutualPreview(props: MutualPreviewProps): ReactElement {
  const { targetUserId, variant, visibility, mutuals, total, className } = props;

  // Privacy gate — render the privacy notice when visibility is
  // not explicitly 'visible'. The safe default is the privacy
  // notice so we never leak avatars before the server-derived
  // decision arrives.
  if (PRIVACY_BLOCKING.has(visibility) || visibility !== "visible") {
    const privacyVariant: "not_available" | "friends_only" =
      visibility === "friends_only" ? "friends_only" : "not_available";
    return (
      <PrivacyRestrictedNotice
        variant={privacyVariant}
        resourceKind={resourceKindFor(variant)}
      />
    );
  }

  // Empty branch — render the documented inline empty copy.
  if (mutuals.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid={`mutual-preview-${variant}-empty`}
        data-target-user-id={targetUserId}
        data-variant={variant}
        className={className}
      >
        <p className="text-sm text-muted-foreground">{EMPTY_COPY[variant]}</p>
      </div>
    );
  }

  // Populated branch — cap at MUTUAL_PREVIEW_CAP, render the
  // overflow indicator when total exceeds visible.
  const visible = mutuals.slice(0, MUTUAL_PREVIEW_CAP);
  const overflow = total !== undefined
    ? mutualCountOverflow(visible.length, total)
    : 0;

  return (
    <div
      role="list"
      data-testid={`mutual-preview-${variant}`}
      data-target-user-id={targetUserId}
      data-variant={variant}
      data-visible-count={visible.length}
      data-total={total ?? null}
      data-overflow={overflow}
      className={className}
    >
      <div className="flex items-center gap-2">
        {visible.map((user) => (
          <Link
            key={user.id}
            href={`/users/${encodeURIComponent(user.userId)}`}
            data-testid="mutual-preview-avatar"
            data-user-id={user.userId}
            aria-label={`View profile for ${user.userName}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar>
              {user.avatarUrl !== null && (
                <AvatarImage src={user.avatarUrl} alt={`${user.userName}'s avatar`} />
              )}
              <AvatarFallback>{user.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
        ))}
        {overflow > 0 && (
          <Badge
            data-testid="mutual-preview-overflow"
            data-overflow={overflow}
            variant="secondary"
            aria-label={`${overflow} more`}
          >
            +{overflow} more
          </Badge>
        )}
      </div>
    </div>
  );
}
