"use client";

import { type ReactElement } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type {
SocialBlockedUserDto,
SocialUserSummaryDto,
} from "../types";

import { trackSocialListRowTapped } from "../utils/social-list-analytics";

export type SocialListRowVariant = "summary" | "blocked";

export interface SocialListRowProps {

user: SocialUserSummaryDto | SocialBlockedUserDto;

variant: SocialListRowVariant;

onNavigate?: (userId: string) => void;

className?: string;
}

function toSummaryDto(
user: SocialUserSummaryDto | SocialBlockedUserDto,
): SocialUserSummaryDto {
if ("user" in user && user.user !== undefined) {
return user.user;
  }
return user as SocialUserSummaryDto;
}

export function SocialListRow(props: SocialListRowProps): ReactElement {
const { user, variant, onNavigate, className } = props;
const summary = toSummaryDto(user);

const href = `/users/${encodeURIComponent(summary.userId)}`;

const handleClick = (): void => {
trackSocialListRowTapped({
userId: summary.userId,
variant,
    });
onNavigate?.(summary.userId);
  };

return (
<Link
href={href}
onClick={handleClick}
data-testid={`social-list-row-${variant}`}
data-user-id={summary.userId}
aria-label={`View profile for ${summary.userName}`}
className={cn(
"flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
className,
      )}
    >
<Avatar>
{summary.avatarUrl !== null && (
<AvatarImage src={summary.avatarUrl} alt={`${summary.userName}'s avatar`} />
        )}
<AvatarFallback>{summary.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
</Avatar>
<span className="flex flex-col">
<span className="font-medium leading-none">{summary.userName}</span>
{summary.displayName !== null && (
<span className="text-sm text-muted-foreground">
{summary.displayName}
</span>
        )}
</span>
</Link>
  );
}