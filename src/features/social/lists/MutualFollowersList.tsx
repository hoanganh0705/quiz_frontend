"use client";

import { type ReactElement } from "react";

import { useMutualFollowers } from "@/features/social/hooks/useMutualFollowers";

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

interface MutualFollowersListProps {

targetUserId: string;
}

function toPrivacyVariant(
visibility: string,
): PrivacyRestrictedNoticeVariant {
if (visibility === "private") return "friends_only";
return "not_available";
}

export function MutualFollowersList({
targetUserId,
}: MutualFollowersListProps): ReactElement {
const {
items,
total,
visibility,
isLoading,
error,
hasMore,
loadMore,
retry,
  } = useMutualFollowers(targetUserId);

if (visibility !== "visible") {
return (
<PrivacyRestrictedNotice
variant={toPrivacyVariant(visibility)}
resourceKind="followers"
      />
    );
  }

if (isLoading && items.length === 0) {
return <MutualListSkeleton />;
  }

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

if (items.length === 0) {
return <MutualEmptyState variant="followers" />;
  }

return (
<BlockedContentGate targetUserId={targetUserId}>
<section
aria-label="Mutual followers"
data-testid="mutual-followers-list"
data-target-user-id={targetUserId}
data-total={total}
className="flex flex-col gap-2"
      >
<h1 className="text-lg font-semibold">Mutual followers</h1>
<ul className="flex flex-col gap-1">
{items.map((item: SocialMutualDto) => (
<li
key={item.id}
data-testid="mutual-followers-list-row"
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
data-testid="mutual-followers-list-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
Load more
          </button>
        )}
</section>
</BlockedContentGate>
  );
}
