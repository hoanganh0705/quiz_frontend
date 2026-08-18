"use client";

import { type ReactElement, useEffect, useRef } from "react";
import Link from "next/link";

import { useSocialCountsBadge } from "@/features/social/hooks/useSocialCountsBadge";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import { addSocialCountsBadgeBreadcrumb } from "@/lib/social/social-search-sentry";

import { type SocialCountsDto } from "../types";

interface SocialCountsBadgeProps {
targetUserId: string;
}

interface CountChipConfig {
label: string;
testId: string;
getValue: (counts: SocialCountsDto) => number;
href: (targetUserId: string) => string;
}

const CHIPS: readonly CountChipConfig[] = [
{
label: "Followers",
testId: "social-counts-badge-followers",
getValue: (c) => c.followers,
href: (id) => `/social/users/${encodeURIComponent(id)}/followers`,
  },
{
label: "Following",
testId: "social-counts-badge-following",
getValue: (c) => c.following,
href: (id) => `/social/users/${encodeURIComponent(id)}/following`,
  },
{
label: "Friends",
testId: "social-counts-badge-friends",
getValue: (c) => c.friends,
href: (id) => `/social/users/${encodeURIComponent(id)}/friends`,
  },
];

export function SocialCountsBadge({
targetUserId,
}: SocialCountsBadgeProps): ReactElement | null {
const { counts, isLoading, isStale } = useSocialCountsBadge(targetUserId);
const visibility = useSocialListVisibility(targetUserId);

const prevFetchStateRef = useRef<"loading" | "ready">(
counts === null && isLoading ? "loading" : "ready",
  );
useEffect(() => {
const next: "loading" | "ready" =
counts === null && isLoading ? "loading" : "ready";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialCountsBadgeBreadcrumb({
targetUserId,
status: counts === null ? 0 : 200,
    });
  }, [counts, isLoading, targetUserId]);

const showFriends = visibility.canViewFriends;

if (counts === null && !isLoading) {
return null;
  }

const visible = CHIPS.filter((c) =>
c.testId === "social-counts-badge-friends" ? showFriends : true,
  );

return (
<div
data-testid="social-counts-badge"
data-is-stale={isStale ? "true" : "false"}
data-is-loading={isLoading ? "true" : "false"}
aria-label="Social counts"
className="flex flex-wrap gap-2"
    >
{visible.map((chip) => {
const value = counts !== null ? chip.getValue(counts) : 0;
return (
<Link
key={chip.testId}
href={chip.href(targetUserId)}
data-testid={chip.testId}
className="rounded-full border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
          >
<span className="font-medium">{value}</span>{" "}
<span className="text-muted-foreground">{chip.label}</span>
</Link>
        );
      })}
{(isLoading || isStale) && (
<span
data-testid="social-counts-badge-stale-indicator"
aria-label="Updating"
className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
Updating…
        </span>
      )}
</div>
  );
}