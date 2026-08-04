"use client";

/**
 * `ConsistencyNotice` — eventual-consistency messaging primitive.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.C3.
 *
 * ## What this primitive owns
 *
 * A reusable, accessible presentational component that:
 *
 *   1. Renders nothing when `isStale === false` (TKT-5.5.C3 AC #1).
 *   2. Renders a subtle indicator with `role="status"` and
 *      `aria-live="polite"` when `isStale === true` (AC #2).
 *   3. Includes the formatted `lastValidatedAt` timestamp when
 *      provided (AC #3).
 *   4. Never claims a fabricated optimistic value — it only
 *      communicates that data is being refreshed (AC #4).
 *   5. Supports dark/light theme via the existing design tokens
 *      (`bg-muted`, `text-muted-foreground`, `border-border`)
 *      (AC #5).
 *
 * ## Why a primitive
 *
 * Every ranking and achievement surface that shows cached data must
 * communicate lag without contradicting the data on screen.
 * Centralising the copy and accessibility semantics here keeps each
 * page focused on data composition.
 *
 * ## SSR-safety
 *
 * The component is a thin presentational wrapper; it does not access
 * `window` or `document`. Safe to render in a server component or
 * during hydration.
 */

import { Loader2 } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ConsistencyNoticeProps {
  /**
   * `true` while SWR revalidation is in flight and cached data is
   * present. When `false`, the component renders `null`.
   */
  isStale: boolean;
  /**
   * Optional ISO 8601 timestamp of the last successful response.
   * When provided, the notice includes the formatted timestamp so
   * the user understands how recent the cached data is.
   */
  lastValidatedAt?: string | null;
  /**
   * Optional override for the message text. Defaults to a generic
   * "Refreshing data…" string. The component never claims a new
   * value is ready — only that data is being revalidated.
   */
  message?: string;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format an ISO 8601 timestamp as a short, locale-aware date+time
 * string. Uses `Intl.DateTimeFormat` directly so the component does
 * not depend on any i18n library.
 *
 * Falls back to the raw input string when the timestamp is not a
 * valid date (defensive — the hook is the source of truth).
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Render an eventual-consistency notice.
 *
 * - When `isStale === false`, renders `null`.
 * - When `isStale === true`, renders a subtle indicator with the
 *   message text and, optionally, the formatted `lastValidatedAt`
 *   timestamp. The element has `role="status"` and
 *   `aria-live="polite"` so screen readers announce the refresh
 *   without stealing focus.
 *
 * The component never claims a fabricated optimistic value. The
 * icon and copy communicate only that cached data is being refreshed.
 */
export function ConsistencyNotice({
  isStale,
  lastValidatedAt,
  message = "Refreshing data…",
  className,
}: ConsistencyNoticeProps) {
  if (!isStale) return null;

  const hasTimestamp =
    typeof lastValidatedAt === "string" && lastValidatedAt.length > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="consistency-notice"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Loader2
        aria-hidden="true"
        className="h-3 w-3 animate-spin shrink-0"
      />
      <span>{message}</span>
      {hasTimestamp ? (
        <span
          aria-label={`Last validated at ${formatTimestamp(lastValidatedAt as string)}`}
          className="font-mono tabular-nums text-muted-foreground/80"
        >
          · {formatTimestamp(lastValidatedAt as string)}
        </span>
      ) : null}
    </div>
  );
}