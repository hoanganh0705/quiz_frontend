"use client";

import Link from "next/link";
import { type ReactElement, type MouseEvent } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { AnalyticsPeriod, FriendLeaderboardEntryDto } from "../types";
import { trackFriendLeaderboardRowTapped } from "../utils/friend-leaderboard-analytics";

export interface FriendLeaderboardRowProps {

entry: FriendLeaderboardEntryDto;

period: AnalyticsPeriod;

onNavigate?: (userId: string) => void;

className?: string;
}

export function FriendLeaderboardRow(
props: FriendLeaderboardRowProps,
): ReactElement {
const { entry, period, onNavigate, className } = props;
const href = `/users/${encodeURIComponent(entry.userId)}`;

const handleClick = (): void => {
trackFriendLeaderboardRowTapped({
userId: entry.userId,
period,
    });
onNavigate?.(entry.userId);
  };

return (
<Link
href={href}
onClick={(e: MouseEvent<HTMLAnchorElement>) => {

handleClick();

void e;
      }}
data-testid="friend-leaderboard-row"
data-rank={entry.rank}
data-user-id={entry.userId}
data-period={period}
aria-label={`View profile for ${entry.username}, rank ${entry.rank}`}
className={cn(
"flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
className,
      )}
    >
<span
data-testid="friend-leaderboard-row-rank"
className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground"
aria-hidden="true"
      >
{entry.rank}
</span>
<Avatar>
{entry.avatarUrl !== null ? (
<AvatarImage
src={entry.avatarUrl}
alt={`${entry.username}'s avatar`}
          />
        ) : null}
<AvatarFallback>
{entry.username.slice(0, 2).toUpperCase()}
</AvatarFallback>
</Avatar>
<span className="flex flex-1 flex-col">
<span className="font-medium leading-none">{entry.username}</span>
{entry.displayName !== null ? (
<span className="text-sm text-muted-foreground">
{entry.displayName}
</span>
        ) : null}
</span>
<span
data-testid="friend-leaderboard-row-xp"
className="text-sm font-semibold tabular-nums"
      >
{entry.xp} XP
      </span>
</Link>
  );
}