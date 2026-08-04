"use client";

/**
 * `useNotificationFeatureFlag` — hook to check phase5_notifications flag.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.E1.
 *
 * ## Usage
 *
 * ```
 * const { isPlaceholder } = useNotificationFeatureFlag();
 * if (isPlaceholder) {
 *   return <NotificationPlaceholder />;
 * }
 * // render live notification surface
 * ```
 */

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseNotificationFeatureFlagResult {
  /** True when the feature flag is set to 'placeholder'. */
  isPlaceholder: boolean;
  /** The raw flag value. */
  flagValue: "live" | "placeholder";
}

/**
 * Check the `phase5_notifications` feature flag.
 *
 * Used by page components and the bell guard to conditionally render
 * the live notification surface or the safe placeholder fallback.
 */
export function useNotificationFeatureFlag(): UseNotificationFeatureFlagResult {
  const flagValue = getFeatureFlagValue("phase5_notifications");
  const isPlaceholder = flagValue === "placeholder";

  return {
    isPlaceholder,
    flagValue,
  };
}