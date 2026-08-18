"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { useSocialCounts } from "@/features/social/hooks/useSocialCounts";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import type { SocialCountsDto } from "../types";

export type SocialCountsCardVariant = "hub" | "badge";

interface SocialCountsCardProps {

targetUserId: string;

variant?: SocialCountsCardVariant;
}

interface CountChipConfig {
label: string;
testId: string;
getValue: (counts: SocialCountsDto) => number;
href: (targetUserId: string) => string;

friendsGated: boolean;
}

const CHIPS: readonly CountChipConfig[] = [
{
label: "Followers",
testId: "social-counts-card-followers",
getValue: (c) => c.followers,
href: (id) => `/social/users/${encodeURIComponent(id)}/followers`,
friendsGated: false,
  },
{
label: "Following",
testId: "social-counts-card-following",
getValue: (c) => c.following,
href: (id) => `/social/users/${encodeURIComponent(id)}/following`,
friendsGated: false,
  },
{
label: "Friends",
testId: "social-counts-card-friends",
getValue: (c) => c.friends,
href: (id) => `/social/users/${encodeURIComponent(id)}/friends`,
friendsGated: true,
  },
];

export function SocialCountsCard({
targetUserId,
variant = "hub",
}: SocialCountsCardProps): ReactElement | null {
const { counts, isLoading, isStale, error } = useSocialCounts(targetUserId);
const visibility = useSocialListVisibility(targetUserId);

if (error !== null && !isLoading) {
return null;
  }

if (counts === null && !isLoading) {
return null;
  }

const showFriends = visibility.canViewFriends;
const visibleChips = CHIPS.filter((c) =>
c.friendsGated ? showFriends : true,
  );

const containerClass =
variant === "hub"
? "rounded-md border border-border p-4"
: "rounded-full border border-border bg-background px-3 py-1 text-sm";

return (
<div
data-testid="social-counts-card"
data-variant={variant}
data-is-stale={isStale ? "true" : "false"}
aria-label="Social counts"
className="flex flex-wrap items-center gap-2"
    >
<div className={containerClass}>
<ul className="flex flex-wrap gap-2">
{visibleChips.map((chip) => {
const value = counts !== null ? chip.getValue(counts) : 0;
return (
<li key={chip.testId}>
<Link
href={chip.href(targetUserId)}
data-testid={chip.testId}
className="rounded-full border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
                >
<span className="font-medium tabular-nums">{value}</span>{" "}
<span className="text-muted-foreground">{chip.label}</span>
</Link>
</li>
            );
          })}
</ul>
</div>
{isStale ? (
<span
data-testid="social-counts-card-stale-indicator"
aria-label="Updating"
className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
Updating…
        </span>
      ) : null}
</div>
  );
}