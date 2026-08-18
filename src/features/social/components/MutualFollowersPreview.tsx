"use client";

import { type ReactElement } from "react";
import Link from "next/link";

import { useMutualFollowers } from "@/features/social/hooks/useMutualFollowers";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import { MutualPreview } from "@/features/social/components/MutualPreview";
import { MutualPreviewSkeleton } from "@/features/social/components/MutualPreviewSkeleton";

import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

interface MutualFollowersPreviewProps {

targetUserId: string;
}

function toPreviewVisibility(
canViewFriends: boolean,
visibility: string,
): "visible" | "not_available" | "loading" {
if (visibility !== "visible") return "not_available";
if (!canViewFriends) return "not_available";
return "visible";
}

function toSummaryDtos(
items: readonly { user: SocialUserSummaryDto }[],
): readonly SocialUserSummaryDto[] {
return items.map((item) => item.user);
}

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
