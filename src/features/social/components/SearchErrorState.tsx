"use client";

/**
 * `SearchErrorState` — Error-state component for the social discovery
 * and user-search surfaces.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B3.
 *
 * ## What this component owns
 *
 * The error-state copy for the social discovery and user-search surfaces.
 * The component maps documented `ErrorCode` values to explicit copy.
 * `GLOBAL_RATE_LIMITED` and `SOCIAL_SEARCH_RATE_LIMITED` are intentionally
 * excluded — the rate-limit branch renders `SearchRateLimitNotice`
 * (TKT-6.5.B4) instead.
 *
 * ## Why a Client Component
 *
 * Marked `"use client"` for parity with the other search primitives.
 * The component is purely presentational; no hooks are called.
 *
 * ## SSR-safety
 *
 * The component is purely presentational and uses no browser-only API.
 */

import { type ReactElement } from "react";

import type { ErrorCode } from "@/lib/api/error-codes";

type SearchErrorCode =
  | "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_INTERNAL_ERROR"
  | "GLOBAL_BAD_REQUEST"
  | "GLOBAL_VALIDATION_FAILED";

interface SearchErrorStateProps {
  /**
   * The error code from the service wrapper's `ApiError`.
   *
   * Supported codes:
   *   - `GLOBAL_UNAUTHENTICATED`    — unauthenticated copy
   *   - `GLOBAL_FORBIDDEN`          — forbidden copy
   *   - `GLOBAL_NOT_FOUND`          — not-found copy
   *   - `GLOBAL_INTERNAL_ERROR`      — server error copy
   *   - `GLOBAL_BAD_REQUEST`        — bad request copy
   *   - `GLOBAL_VALIDATION_FAILED`  — validation error copy
   *
   * `GLOBAL_RATE_LIMITED` is NOT handled here — use
   * `SearchRateLimitNotice` (TKT-6.5.B4) for the rate-limit branch.
   */
  errorCode: SearchErrorCode;
  /** Optional retry callback. When provided, renders a retry button. */
  onRetry?: () => void;
}

function buildCopy(code: SearchErrorStateProps["errorCode"]): {
  title: string;
  body: string;
} {
  switch (code) {
    case "GLOBAL_UNAUTHENTICATED":
      return {
        title: "Sign in required",
        body: "Sign in to see social suggestions and search results.",
      };
    case "GLOBAL_FORBIDDEN":
      return {
        title: "Access denied",
        body: "You don't have permission to view this content.",
      };
    case "GLOBAL_NOT_FOUND":
      return {
        title: "Not found",
        body: "We couldn't find what you were looking for.",
      };
    case "GLOBAL_BAD_REQUEST":
      return {
        title: "Invalid search",
        body: "Your search query is invalid. Try a different search.",
      };
    case "GLOBAL_VALIDATION_FAILED":
      return {
        title: "Invalid search",
        body: "Your search query contains invalid characters. Try a different search.",
      };
    case "GLOBAL_INTERNAL_ERROR":
    default:
      return {
        title: "Something went wrong",
        body: "We couldn't load results. Please try again.",
      };
  }
}

export function SearchErrorState({
  errorCode,
  onRetry,
}: SearchErrorStateProps): ReactElement {
  const copy = buildCopy(errorCode);
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="search-error-state"
      data-error-code={errorCode}
      className="flex flex-col gap-2 p-6 text-center"
    >
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 mx-auto rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          data-testid="search-error-retry"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
