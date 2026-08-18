"use client";

import { useEffect, useState, type ReactElement } from "react";

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface FeedLoadMoreProps {

readonly hasMore: boolean;

readonly isLoadingMore: boolean;

readonly onLoadMore: () => void;

readonly rateLimitedUntil: number | null;
}

function formatSecondsRemaining(targetMs: number): number {
const remainingMs = Math.max(0, targetMs - Date.now());
return Math.ceil(remainingMs / 1000);
}

export function FeedLoadMore({
hasMore,
isLoadingMore,
onLoadMore,
rateLimitedUntil,
}: FeedLoadMoreProps): ReactElement | null {
const initialSecondsRemaining =
rateLimitedUntil !== null ? formatSecondsRemaining(rateLimitedUntil) : 0;
const [secondsRemaining, setSecondsRemaining] = useState<number>(
initialSecondsRemaining,
  );

useEffect(() => {
if (rateLimitedUntil === null) {

setSecondsRemaining(0);
return;
    }
setSecondsRemaining(formatSecondsRemaining(rateLimitedUntil));
const timer = setInterval(() => {
const next = formatSecondsRemaining(rateLimitedUntil);
setSecondsRemaining(next);
if (next <= 0) {
clearInterval(timer);
      }
    }, 1_000);
return () => clearInterval(timer);
  }, [rateLimitedUntil]);

if (!hasMore) return null;

if (rateLimitedUntil !== null) {
if (secondsRemaining > 0) {
return (
<div
data-testid="feed-load-more"
data-load-more-branch="rate-limited"
data-seconds-remaining={secondsRemaining}
className="flex justify-center p-4"
        >
<button
type="button"
disabled={true}
aria-label={`Try again in ${secondsRemaining} seconds`}
data-testid="feed-load-more-button-rate-limited"
className="rounded-md border border-border bg-background px-3 py-1 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
Try again in {secondsRemaining} second
            {secondsRemaining === 1 ? "" : "s"}
</button>
</div>
      );
    }
  }

if (isLoadingMore) {
return (
<div
data-testid="feed-load-more"
data-load-more-branch="loading"
className="flex justify-center p-4"
      >
<button
type="button"
disabled={true}
aria-label="Loading more"
data-testid="feed-load-more-button-loading"
className="rounded-md border border-border bg-background px-3 py-1 text-sm disabled:pointer-events-none disabled:opacity-50 inline-flex items-center gap-2"
        >
<FollowPendingIndicator text="Loading..." size="sm" />
</button>
</div>
    );
  }

return (
<div
data-testid="feed-load-more"
data-load-more-branch="enabled"
className="flex justify-center p-4"
    >
<button
type="button"
onClick={onLoadMore}
aria-label="Load more"
data-testid="feed-load-more-button"
className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
Load more
      </button>
</div>
  );
}