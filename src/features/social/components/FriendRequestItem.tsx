"use client";

import {
type ReactElement,
type ReactNode,
} from "react";

import {
Avatar,
AvatarFallback,
AvatarImage,
} from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { SocialFriendRequestDto } from "@/features/social/types";

export interface FriendRequestItemActionContext {

readonly friendshipId: string;

readonly targetUserId: string;

readonly request: SocialFriendRequestDto;
}

export interface FriendRequestItemProps {

readonly request: SocialFriendRequestDto;

readonly children: (
actionContext: FriendRequestItemActionContext,
  ) => ReactNode;

readonly className?: string;
}

function formatRelativeSentAt(iso: string): string {
const sent = new Date(iso).getTime();
if (Number.isNaN(sent)) return "";
const deltaMs = Date.now() - sent;
if (deltaMs < 0) return "just now";
const seconds = Math.floor(deltaMs / 1000);
if (seconds < 60) return "just now";
const minutes = Math.floor(seconds / 60);
if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
const hours = Math.floor(minutes / 60);
if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
const days = Math.floor(hours / 24);
if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
const weeks = Math.floor(days / 7);
if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
const months = Math.floor(days / 30);
if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
const years = Math.floor(days / 365);
return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function FriendRequestItem({
request,
children,
className,
}: FriendRequestItemProps): ReactElement {
const sentAt = formatRelativeSentAt(request.createdAt);
const requester = request.requester;

return (
<div
data-testid="friend-request-item"
data-friendship-id={request.id}
data-target-user-id={requester.userId}
className={cn(
"flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
className,
      )}
    >
<Avatar>
{requester.avatarUrl !== null && (
<AvatarImage
src={requester.avatarUrl}
alt={`${requester.userName}'s avatar`}
          />
        )}
<AvatarFallback>
{requester.userName.slice(0, 2).toUpperCase()}
</AvatarFallback>
</Avatar>

<div className="flex flex-1 flex-col">
<span className="font-medium leading-none">{requester.userName}</span>
{requester.displayName !== null && (
<span className="text-sm text-muted-foreground">
{requester.displayName}
</span>
        )}
</div>

<span className="text-sm text-muted-foreground">{sentAt}</span>

<div className="ml-2 flex items-center gap-2">
{children({
friendshipId: request.id,
targetUserId: request.requesterId,
request,
        })}
</div>
</div>
  );
}
