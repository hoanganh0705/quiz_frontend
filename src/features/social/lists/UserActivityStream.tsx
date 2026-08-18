"use client";

import {
useCallback,
useEffect,
useState,
type ReactElement,
} from "react";

import { ApiError } from "@/lib/api";

import { useUserActivity } from "@/features/social/hooks/useUserActivity";
import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";

import { ActivityEmptyState } from "@/features/social/components/ActivityEmptyState";
import { ActivityErrorState } from "@/features/social/components/ActivityErrorState";
import { ActivityRateLimitNotice } from "@/features/social/components/ActivityRateLimitNotice";
import { ActivitySkeleton } from "@/features/social/components/ActivitySkeleton";
import { ActivityStreamItem } from "@/features/social/components/ActivityStreamItem";
import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import {
PrivacyRestrictedNotice,
type PrivacyRestrictedNoticeVariant,
} from "@/features/social/components/PrivacyRestrictedNotice";

import type { SocialActivityItemDto } from "@/features/social/types";

interface UserActivityStreamProps {

targetUserId: string;

viewerUserId?: string | null;
}

function toPrivacyVariant(
visibility: string,
): PrivacyRestrictedNoticeVariant {
if (visibility === "private") return "friends_only";
return "not_available";
}

export function UserActivityStream({
targetUserId,
viewerUserId,
}: UserActivityStreamProps): ReactElement {
const {
items,
total,
visibility,
isLoading,
error,
hasMore,
loadMore,
retry,
rateLimitedUntil,
staleness,
  } = useUserActivity(targetUserId);

const safeViewerId = viewerUserId ?? "anonymous-viewer";

const [cooldownSeconds, setCooldownSeconds] = useState<number>(() =>
rateLimitedUntil !== null
? Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000))
: 0,
  );

useEffect(() => {
if (rateLimitedUntil === null) {

setCooldownSeconds(0);
return undefined;
    }
const tick = (): void => {
const remaining = Math.max(
0,
Math.ceil((rateLimitedUntil - Date.now()) / 1000),
      );
setCooldownSeconds(remaining);
    };
tick();
const id = setInterval(tick, 1_000);
return () => clearInterval(id);
  }, [rateLimitedUntil]);

const handleCooldownComplete = useCallback((): void => {
void retry();
  }, [retry]);

if (visibility !== "visible") {
return (
<PrivacyRestrictedNotice
variant={toPrivacyVariant(visibility)}
resourceKind="followers"
      />
    );
  }

if (rateLimitedUntil !== null) {
return (
<ActivityRateLimitNotice
cooldownSeconds={cooldownSeconds}
onCooldownComplete={handleCooldownComplete}
      />
    );
  }

if (isLoading && items.length === 0) {
return <ActivitySkeleton />;
  }

if (
items.length === 0 &&
error !== null &&
(error.code === "SOCIAL_USER_BLOCKED" ||
error.code === "SOCIAL_BLOCKED_USER")
  ) {
return <ActivityEmptyState isBlocked />;
  }

if (error !== null && items.length === 0 && !isActivityRateLimitCode(error.code)) {
return (
<ActivityErrorState
error={error}
onRetry={() => {
void retry();
        }}
      />
    );
  }

if (items.length === 0) {
return <ActivityEmptyState />;
  }

return (
<BlockedContentGate targetUserId={targetUserId}>
<section
aria-label="User activity"
data-testid="user-activity-stream"
data-target-user-id={targetUserId}
data-total={total}
className="flex flex-col gap-2"
      >
<h1 className="text-lg font-semibold">Activity</h1>
{staleness !== "fresh" && <ConsistencyNotice staleness={staleness} />}
<ul className="flex flex-col gap-2">
{items.map((item: SocialActivityItemDto) => (
<li
key={item.id}
data-testid="user-activity-stream-row"
data-item-id={item.id}
            >
<ActivityStreamItem
item={item}
viewerUserId={safeViewerId}
              />
</li>
          ))}
</ul>
{hasMore && (
<button
type="button"
onClick={() => loadMore()}
data-testid="user-activity-stream-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
Load more
          </button>
        )}
</section>
</BlockedContentGate>
  );
}

export type { ApiError };
