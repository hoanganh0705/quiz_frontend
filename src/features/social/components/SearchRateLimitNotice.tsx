"use client";

/**
 * `SearchRateLimitNotice` — Explicit per-IP rate-limit notice for the
 * social user-search surface.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B4.
 *
 * ## What this component owns
 *
 * The single rate-limit notice for the social user-search surface. The
 * component:
 *
 *   - Renders surface-specific copy with a countdown.
 *   - Calls `onCooldownComplete` when the cooldown expires (via
 *     a `setTimeout`).
 *   - Disables the retry CTA while the cooldown is active.
 *
 * The component is intentionally separate from `SearchErrorState`
 * (TKT-6.5.B3) — the rate-limit branch is a dedicated surface
 * because the user expects a "try again in N seconds" CTA, not a
 * generic error.
 *
 * ## Why a Client Component
 *
 * The countdown uses `useEffect` to drive the per-second tick and
 * `onCooldownComplete`. The component is otherwise presentational.
 *
 * ## SSR-safety
 *
 * The component uses `useEffect` (which never runs on the server)
 * so the initial render is identical on server and client. The
 * countdown updates only after mount.
 */

import { useEffect, useState, type ReactElement } from "react";

import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";

interface SearchRateLimitNoticeProps {
  /**
   * The cooldown in seconds returned by the search service.
   * `null` means the notice is not shown.
   */
  cooldownSeconds: number | null;
  /**
   * Which surface the notice is rendered in.
   *
   *   - `global-search-bar` — "Search rate limit reached. Try again in N seconds."
   *   - `social-search-page` — "You've searched too often. Wait N seconds before the next search."
   */
  surface: "global-search-bar" | "social-search-page";
  /**
   * Optional callback invoked when the cooldown reaches `0`. The
   * caller can use the callback to re-enable the search input or to
   * dismiss the notice. When omitted, the notice renders the
   * "You can try again now" copy once the countdown ends.
   */
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

  // The `remainingSeconds` from the hook is the authoritative countdown.
  // We track it locally for the render, mirroring the pattern in
  // `ActivityRateLimitNotice` (Epic 6.4 / TKT-6.4.B3).
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
