"use client";

/**
 * `scroll-guard.tsx` — Router guard that intercepts navigation to
 * URLs containing unstable IDs.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.G3.
 *
 * ## What this module owns
 *
 * A Next.js middleware-compatible guard that:
 *
 *   1. Intercepts navigation events via `useEffect` + `window.location`.
 *   2. Inspects every dynamic route segment for the `followId` /
 *      `friendshipId` shape (UUIDv4-shaped strings).
 *   3. Redirects to `/social` when any segment matches the shape.
 *   4. Emits a Sentry breadcrumb with `reason: 'rejected_unstable_id'`.
 *
 * ## Why this guard exists
 *
 * The cross-batch invariant "no direct navigation to unstable IDs"
 * requires that:
 *   - Follow IDs and friendship IDs (internal, ephemeral identifiers)
 *     must never appear in URLs.
 *   - Users must not be able to navigate directly to URLs containing
 *     these IDs.
 *
 * This guard is the project-wide enforcement mechanism.
 *
 * ## UUIDv4 pattern
 *
 * A UUIDv4 has the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is one of 8, 9, a, or b.
 * The pattern matches the most common UUIDv4 regex.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

/**
 * Pattern that matches UUIDv4-shaped strings.
 * Used to detect `followId` / `friendshipId` segments in URLs.
 *
 * Matches: `550e8400-e29b-41d4-a716-446655440000`
 * Matches: `6ba7b810-9dad-41d1-80b4-00c04fd430c8`
 *
 * Does NOT match: plain usernames, numbers, or non-UUID strings.
 */
const UUIDV4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string matches the unstable ID pattern (UUIDv4 shape).
 */
export function matchesUnstableId(segment: string): boolean {
  return UUIDV4_PATTERN.test(segment);
}

/**
 * Check if a URL contains any unstable ID segments.
 */
export function urlContainsUnstableId(href: string): boolean {
  try {
    // Extract path segments from the URL.
    const url = new URL(href, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);

    // Check each segment against the unstable ID pattern.
    return segments.some(matchesUnstableId);
  } catch {
    // Invalid URL — treat as safe.
    return false;
  }
}

interface ScrollGuardProps {
  /** Children to render. */
  children: React.ReactNode;
}

/**
 * `ScrollGuard` — URL-rejected-id guard component.
 *
 * Wrap your app layout with this component to enable the guard.
 *
 * ## Usage
 *
 * ```tsx
 * // In your root layout or a shared layout:
 * <ScrollGuard>
 *   {children}
 * </ScrollGuard>
 * ```
 *
 * ## Sentry integration
 *
 * On each rejection, the guard emits a breadcrumb:
 *   - `category`: `phase6:6.5`
 *   - `message`: `url-rejected-id-guard`
 *   - `data.reason`: `rejected_unstable_id`
 *   - `data.href`: The rejected URL
 */
export function ScrollGuard({ children }: ScrollGuardProps) {
  const router = useRouter();

  useEffect(() => {
    // Listen to popstate events (back/forward navigation).
    const handlePopState = () => {
      const currentHref = window.location.href;
      if (urlContainsUnstableId(currentHref)) {
        // Emit Sentry breadcrumb.
        Sentry.addBreadcrumb({
          category: "phase6:6.5",
          message: "url-rejected-id-guard",
          level: "warning",
          data: {
            reason: "rejected_unstable_id",
            href: currentHref,
          },
        });

        // Redirect to social hub.
        window.history.pushState(null, "", "/social");
        router.replace("/social");
      }
    };

    // Intercept pushState and replaceState to catch programmatic navigation.
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    function interceptPushState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: any,
      _unused: string,
      url?: string | URL | null,
    ) {
      const targetHref = url?.toString() ?? window.location.href;
      if (urlContainsUnstableId(targetHref)) {
        Sentry.addBreadcrumb({
          category: "phase6:6.5",
          message: "url-rejected-id-guard",
          level: "warning",
          data: {
            reason: "rejected_unstable_id",
            href: targetHref,
          },
        });

        // Redirect to social hub instead.
        return originalReplaceState.call(window.history, state, _unused, "/social");
      }
      return originalPushState.call(window.history, state, _unused, url);
    }

    function interceptReplaceState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: any,
      _unused: string,
      url?: string | URL | null,
    ) {
      const targetHref = url?.toString() ?? window.location.href;
      if (urlContainsUnstableId(targetHref)) {
        Sentry.addBreadcrumb({
          category: "phase6:6.5",
          message: "url-rejected-id-guard",
          level: "warning",
          data: {
            reason: "rejected_unstable_id",
            href: targetHref,
          },
        });

        // Redirect to social hub instead.
        return originalReplaceState.call(window.history, state, _unused, "/social");
      }
      return originalReplaceState.call(window.history, state, _unused, url);
    }

    // Attach interceptors.
    window.history.pushState = interceptPushState;
    window.history.replaceState = interceptReplaceState;

    // Check current URL on mount.
    handlePopState();

    // Attach popstate listener.
    window.addEventListener("popstate", handlePopState);

    // Cleanup.
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return <>{children}</>;
}
