"use client";

/**
 * `MutualPreviewSkeleton` — Loading placeholder for the
 * `MutualPreview` horizontal avatar-row.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.B3 (shared loading skeleton).
 *
 * ## What this component owns
 *
 * A horizontal avatar-row skeleton matching the shape of
 * `MutualPreview`. The default avatar count is `MUTUAL_PREVIEW_CAP`
 * so the skeleton size matches the eventual visible count.
 *
 * `aria-busy="true"` on the root.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

interface MutualPreviewSkeletonProps {
  /** Number of avatar placeholders to render. Defaults to
   *  `MUTUAL_PREVIEW_CAP` (6). */
  avatarCount?: number;
}

export function MutualPreviewSkeleton({
  avatarCount = MUTUAL_PREVIEW_CAP,
}: MutualPreviewSkeletonProps = {}): ReactElement {
  const avatars = Array.from({ length: avatarCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading mutual preview"
      data-testid="mutual-preview-skeleton"
      data-avatar-count={avatarCount}
      className="flex items-center gap-2 p-3"
    >
      {avatars.map((_, i) => (
        <Skeleton key={i} className="size-8 rounded-full" />
      ))}
    </div>
  );
}
