"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

interface MutualPreviewSkeletonProps {

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
