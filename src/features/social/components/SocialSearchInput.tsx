"use client";

/**
 * `SocialSearchInput` — Reusable search input with debounce indicator
 * and rate-limit-aware disabled state.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.F1.
 *
 * ## What this component owns
 *
 * A controlled input component that:
 *
 *   - Is fully controlled (no internal `value` state).
 *   - Shows a debounce indicator while the input `value` differs from
 *     the latest debounced value.
 *   - Is `disabled === true` while `cooldownSeconds > 0`.
 *   - Calls `onChange(next)` on input change.
 *
 * ## Why a Client Component
 *
 * The debounce indicator uses `useEffect` for timing. The rate-limit
 * disabled state uses `useState` for the countdown display.
 */

import { type ReactElement, useEffect, useState } from "react";

import { useDebouncedValue } from "@/features/social/hooks/useDebouncedValue";
import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";
import { DEBOUNCE_WINDOW_MS } from "@/features/social/discovery-invariants";

interface SocialSearchInputProps {
  /**
   * The current value of the input.
   */
  value: string;
  /**
   * Callback invoked when the user changes the input.
   */
  onChange: (next: string) => void;
  /**
   * The cooldown in seconds returned by the search service.
   * `null` means no rate limit is active.
   */
  cooldownSeconds: number | null;
  /**
   * Accessible label for the input.
   */
  ariaLabel?: string;
  /**
   * Whether to auto-focus the input on mount.
   */
  autoFocus?: boolean;
  /**
   * Which surface the input is rendered in.
   * Used to configure the cooldown message.
   */
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

/**
 * Render a controlled search input with debounce indicator
 * and rate-limit-aware disabled state.
 */
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

  // Track whether the input value differs from the debounced value.
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
