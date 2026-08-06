"use client";

/**
 * `SocialListErrorState` — Error-state component for the four list
 * pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.C4.
 *
 * ## What this component owns
 *
 * The error-state copy + retry CTA for the four list pages. The
 * component:
 *
 *   - Renders distinct copy for `SOCIAL_USER_NOT_FOUND` (404),
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN` (403), generic 5xx, and
 *     rate-limit responses.
 *   - When `isStale === true`, renders a subtle stale-data marker
 *     above the error explaining that the data shown beneath the
 *     error panel may be out of date.
 *   - Exposes a retry button that calls `onRetry()`.
 *
 * ## Source of copy
 *
 * The default copy uses Phase 4's `getUserCopy(code)` table, which
 * already provides author-driven copy for `SOCIAL_FRIEND_LIST_FORBIDDEN`,
 * `SOCIAL_USER_NOT_FOUND`, and the rate-limit / 5xx synthesized
 * codes. The error-specific copy overrides (see `OVERRIDES`) are
 * used when the default copy is too generic for the list-page
 * context.
 *
 * ## Why a Client Component
 *
 * The retry button requires a click handler, which only works in a
 * client component. The rest of the markup is server-renderable.
 */

import { type ReactElement } from "react";

import type { ApiError } from "@/lib/api";
import { type ErrorCode, getUserCopy } from "@/lib/api/error-codes";

interface SocialListErrorStateProps {
  /** The error to render. May be `null` for an unknown-shape error. */
  error: ApiError | null;
  /**
   * Whether the cached data is stale (i.e. the revalidation
   * failed but cached data is still present). When `true`, the
   * component renders a stale-data marker above the error.
   */
  isStale: boolean;
  /** Retry callback invoked when the user clicks the retry button. */
  onRetry: () => void;
  /**
   * Optional copy override used in tests. Defaults to the Phase 4
   * `getUserCopy` table.
   */
  copyOverride?: { title: string; body: string };
}

interface ResolvedCopy {
  readonly title: string;
  readonly body: string;
}

const OVERRIDES: Partial<Record<ErrorCode, ResolvedCopy>> = {
  USER_NOT_FOUND: {
    title: "This account is no longer available",
    body: "We couldn't find this user. They may have been removed.",
  },
  SOCIAL_FRIEND_LIST_FORBIDDEN: {
    title: "Not available",
    body: "This user's friends list isn't available to you.",
  },
};

function resolveCopy(error: ApiError | null): ResolvedCopy {
  if (error === null) {
    return { title: "Something went wrong", body: "Please try again." };
  }
  const code = error.code;
  if (code in OVERRIDES) {
    return OVERRIDES[code as keyof typeof OVERRIDES]!;
  }
  const copy = getUserCopy(code);
  return { title: copy.title, body: copy.body };
}

function isRateLimited(error: ApiError | null): boolean {
  if (error === null) {
    return false;
  }
  return (
    error.code === "GLOBAL_RATE_LIMITED" || error.code === "AUTH_RATE_LIMITED"
  );
}

function is5xx(error: ApiError | null): boolean {
  if (error === null) {
    return false;
  }
  return error.status >= 500 && error.status <= 599;
}

/**
 * Render the error-state for a list page.
 */
export function SocialListErrorState({
  error,
  isStale,
  onRetry,
  copyOverride,
}: SocialListErrorStateProps): ReactElement {
  const baseCopy = resolveCopy(error);
  const copy = copyOverride ?? baseCopy;

  const rateLimited = isRateLimited(error);
  const serverError = is5xx(error);

  const rateLimitHint =
    rateLimited
      ? "You're going too fast — try again in a moment."
      : null;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="social-list-error-state"
      data-is-stale={isStale ? "true" : "false"}
      data-error-code={error?.code ?? "unknown"}
      className="flex flex-col gap-3 p-6"
    >
      {isStale && (
        <p
          data-testid="social-list-error-state-stale-marker"
          className="text-xs text-muted-foreground"
        >
          The list below may be out of date.
        </p>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {rateLimitHint !== null && (
          <p className="text-sm text-muted-foreground">{rateLimitHint}</p>
        )}
        {serverError && rateLimitHint === null && (
          <p className="text-sm text-muted-foreground">
            Please try again in a moment.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        data-testid="social-list-error-state-retry"
        className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}