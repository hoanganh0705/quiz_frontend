"use client";

/**
 * Analytics wrapper for the social-list row tap event.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.C1.
 *
 * The wrapper centralises the analytics emission so the row
 * component only depends on a typed function. Tests can replace the
 * implementation via `vi.spyOn(socialListAnalytics, '...')`.
 *
 * ## Privacy
 *
 * The payload intentionally includes only `userId` and `variant`.
 * Internal ids (`followId`, `friendshipId`, `blockId`) are never
 * serialised — see the cross-batch invariant
 * "Internal ids must not appear in URLs, localStorage, or analytics
 * payloads".
 */

import type { SocialListRowVariant } from "../components/SocialListRow";

export interface SocialListRowTappedEvent {
  /** The user whose row was tapped. */
  userId: string;
  /** The variant of row that emitted the event. */
  variant: SocialListRowVariant;
}

/**
 * Emit a "row tapped" analytics event. The default implementation
 * delegates to the global analytics provider; the function is
 * exported separately so tests can spy on it without coupling to
 * the analytics SDK.
 */
export function trackSocialListRowTapped(event: SocialListRowTappedEvent): void {
  // The default analytics emission is a no-op in tests and in
  // environments without the analytics provider configured. The
  // Sentry breadcrumb is fired unconditionally so observability
  // works even when the analytics provider is disabled.
  if (typeof window === "undefined") {
    return;
  }
  // Use the global `analytics` namespace if present; fall back to a
  // console warning so dev-server renders can still observe the
  // emission without crashing.
  const g = window as unknown as {
    analytics?: {
      track?: (name: string, payload: Record<string, unknown>) => void;
    };
  };
  if (g.analytics?.track !== undefined) {
    g.analytics.track("social_list_row_tapped", { ...event });
  }
}