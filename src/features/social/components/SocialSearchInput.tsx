"use client";

import { type ReactElement, useEffect, useState } from "react";

import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";
import { DEBOUNCE_WINDOW_MS } from "@/features/social/discovery-invariants";

interface SocialSearchInputProps {

value: string;

onChange: (next: string) => void;

cooldownSeconds: number | null;

ariaLabel?: string;

autoFocus?: boolean;

surface: "global-search-bar" | "social-search-page";
}

const COOLDOWN_MESSAGES: Record<
SocialSearchInputProps["surface"],
{ active: (n: number) => string; complete: string }
> = {
"global-search-bar": {
active: (n) =>
`Rate limited. Try again in ${n}s.`,
complete: "Rate limit lifted.",
  },
"social-search-page": {
active: (n) =>
`Rate limited. Wait ${n}s before searching again.`,
complete: "You can search again.",
  },
};

export function SocialSearchInput({
value,
onChange,
cooldownSeconds,
ariaLabel = "Search",
autoFocus = false,
surface,
}: SocialSearchInputProps): ReactElement {
const { debouncedValue } = useDebouncedValue(value, DEBOUNCE_WINDOW_MS);
const { remainingSeconds, isRateLimited } = useSearchRateLimit(cooldownSeconds);

const [isDebouncing, setIsDebouncing] = useState(false);

useEffect(() => {
const differs = value !== debouncedValue;
setIsDebouncing(differs);
  }, [value, debouncedValue]);

const isDisabled = isRateLimited;
const showCooldownMessage = isRateLimited && remainingSeconds > 0;
const cooldownMessage = COOLDOWN_MESSAGES[surface];

const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
onChange(e.target.value);
  };

return (
<div
className="flex flex-col gap-1"
data-testid="social-search-input"
data-surface={surface}
    >
<div className="relative flex items-center">
<input
type="search"
value={value}
onChange={handleChange}
disabled={isDisabled}
autoFocus={autoFocus}
aria-label={ariaLabel}
data-testid="social-search-input-field"
className="flex-1 rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
{isDebouncing && (
<span
className="absolute right-3 size-4"
aria-label="Loading"
data-testid="social-search-input-debounce-indicator"
          >
<svg
className="size-4 animate-spin text-muted-foreground"
viewBox="0 0 24 24"
fill="none"
xmlns="http://www.w3.org/2000/svg"
            >
<circle
className="opacity-25"
cx="12"
cy="12"
r="10"
stroke="currentColor"
strokeWidth="4"
              />
<path
className="opacity-75"
fill="currentColor"
d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
</svg>
</span>
        )}
</div>
{showCooldownMessage && (
<p
className="text-xs text-muted-foreground"
aria-live="polite"
data-testid="social-search-input-cooldown-message"
        >
{cooldownMessage.active(remainingSeconds)}
</p>
      )}
{!isRateLimited && value === debouncedValue && !isDebouncing && (
<p
className="text-xs text-muted-foreground opacity-0"
aria-hidden="true"
data-testid="social-search-input-ready"
        >
{cooldownMessage.complete}
</p>
      )}
</div>
  );
}
