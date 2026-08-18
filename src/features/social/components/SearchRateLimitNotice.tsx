"use client";

import { useEffect, useState, type ReactElement } from "react";

import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";

interface SearchRateLimitNoticeProps {

cooldownSeconds: number | null;

surface: "global-search-bar" | "social-search-page";

onCooldownComplete?: () => void;
}

const COPY: Record<
SearchRateLimitNoticeProps["surface"],
{ active: (n: number) => string; complete: string }
> = {
"global-search-bar": {
active: (n) =>
`Search rate limit reached. Try again in ${n} second${n === 1 ? "" : "s"}.`,
complete: "Search rate limit lifted. You can search again now.",
  },
"social-search-page": {
active: (n) =>
`You've searched too often. Wait ${n} second${n === 1 ? "" : "s"} before the next search.`,
complete: "Cooldown complete. You can search again.",
  },
};

export function SearchRateLimitNotice({
cooldownSeconds,
surface,
onCooldownComplete,
}: SearchRateLimitNoticeProps): ReactElement {
const { remainingSeconds, isRateLimited, onCooldownComplete: register } =
useSearchRateLimit(cooldownSeconds);

useEffect(() => {
if (onCooldownComplete) {
register(onCooldownComplete);
    }
  }, [register, onCooldownComplete]);

const [displaySeconds, setDisplaySeconds] = useState<number>(() =>
isRateLimited ? remainingSeconds : 0,
  );

useEffect(() => {
setDisplaySeconds(isRateLimited ? remainingSeconds : 0);
  }, [isRateLimited, remainingSeconds]);

const copy = COPY[surface];

if (!isRateLimited && displaySeconds === 0) {
return (
<div
role="status"
aria-live="polite"
data-testid="search-rate-limit-notice"
data-surface={surface}
data-state="complete"
className="flex flex-col gap-1 p-4 text-sm text-muted-foreground text-center"
      >
<p>{copy.complete}</p>
</div>
    );
  }

return (
<div
role="alert"
aria-live="assertive"
data-testid="search-rate-limit-notice"
data-surface={surface}
data-state="active"
className="flex flex-col gap-2 p-4 text-center"
    >
<p className="text-sm font-medium text-foreground">
{copy.active(displaySeconds)}
</p>
<button
type="button"
disabled={isRateLimited}
className="mx-auto rounded-md border border-border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
data-testid="search-rate-limit-retry"
aria-disabled={isRateLimited}
      >
{isRateLimited ? `Retry in ${displaySeconds}s` : "Search"}
</button>
</div>
  );
}
