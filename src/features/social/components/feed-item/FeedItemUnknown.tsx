

import { type ReactElement } from "react";

import { FEED_DEFENSIVE_FALLBACK_TESTID } from "@/features/social/feed-discriminator";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { addFeedBreadcrumb } from "@/lib/social/social-sentry";

export interface FeedItemUnknownProps {

readonly item: SocialFeedItemDto;

readonly rawType: string;
}

export function FeedItemUnknown({
item,
rawType,
}: FeedItemUnknownProps): ReactElement {
const discriminator =
rawType.length > 0 && rawType.length <= 64 ? rawType : undefined;

addFeedBreadcrumb({
route: "feed.item.unknown",
reason: "unknown_discriminator",
...(discriminator !== undefined ? { discriminator } : {}),
  });

return (
<div
data-testid={FEED_DEFENSIVE_FALLBACK_TESTID}
data-item-id={item.id}
role="status"
className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
    >
Recent activity
    </div>
  );
}