"use client";

import { type ReactElement } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { FeedItemRenderer } from "@/features/social/components/FeedItemRenderer";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { formatRelativeTime } from "@/shared/utils/date-utils";

export interface SocialFeedItemProps {

readonly item: SocialFeedItemDto;

readonly viewerUserId: string;
}

export function SocialFeedItem({
item,
viewerUserId,
}: SocialFeedItemProps): ReactElement {

void viewerUserId;

const actor = item.actorUser;
const timestampCopy = formatRelativeTime(item.at);

return (
<BlockedContentGate targetUserId={actor.userId}>
<article
data-testid="social-feed-item"
data-item-id={item.id}
data-item-type={item.type}
data-actor-id={actor.userId}
className="flex items-start gap-3 p-3 rounded-md border border-border"
      >
<Avatar className="size-10 shrink-0">
{actor.avatarUrl !== null ? (
<AvatarImage
src={actor.avatarUrl}
alt={`${actor.userName}'s avatar`}
            />
          ) : null}
<AvatarFallback aria-hidden="true">
{actor.userName.slice(0, 1).toUpperCase()}
</AvatarFallback>
</Avatar>
<div className="flex flex-col gap-1 flex-1 min-w-0">
<div className="flex items-baseline justify-between gap-2">
<p className="text-sm font-medium truncate">{actor.userName}</p>
<time
dateTime={item.at}
className="text-xs text-muted-foreground shrink-0"
data-testid="social-feed-item-timestamp"
            >
{timestampCopy}
</time>
</div>
<div className="text-sm">
<FeedItemRenderer item={item} viewerUserId={viewerUserId} />
</div>
</div>
</article>
</BlockedContentGate>
  );
}