"use client";

/**
 * `useMySocialAnalytics` — Viewer's deep social analytics with
 * period-driven SWR key and eventual-consistency mapping.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.D2.
 *
 * ## What this hook owns
 *
 * The single read hook the `MyAnalyticsPage` (TKT-6.3.F2) calls to
 * fetch the viewer's deep social analytics for a given period.
 * The hook:
 *
 *   - Calls the verified service wrapper `getMySocialAnalytics`
 *     (added to `services/social.service.ts` alongside this hook).
 *   - Projects the wire DTO through `toSocialMyAnalytics`.
 *   - Includes the `period` in the SWR key so changing the period
 *     triggers a revalidation. Scroll preservation across period
 *     changes is owned by `usePeriodFilter` (TKT-6.3.B4), not by
 *     this hook.
 *   - Surfaces `staleness` from the
 *     `useEventuallyConsistentQuery` primitive (TKT-6.3.D4) so the
 *     `ConsistencyNotice` primitive (TKT-6.3.C1) can render the
 *     eventual-consistency copy.
 *   - Short-circuits to the safe fallback for unauthenticated
 *     viewers and when the feature flag is `'placeholder'`.
 *
 * ## Privacy mapping
 *
 *   - `SOCIAL_USER_NOT_FOUND` is mapped to `error` and
 *     `analytics: null`. The analytics endpoint requires auth and
 *     may return 401/404 for unknown users; the page renders the
 *     error state.
 *
 * ## Why this is a client hook
 *
 * The SWR cache is client-side. The route shell
 * (`/social/me/analytics`) renders the
 * `MyAnalyticsSkeleton` (TKT-6.3.C4) during the initial SWR
 * load, per the Story 6.3 SSR safety plan.
 */

import { useCallback, useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  toSocialMyAnalyticsFromEnvelope,
} from "@/features/social/dto-adapters-analytics";
import { getMySocialAnalytics } from "@/features/social/services";
import {
  type AnalyticsPeriod,
  type SocialMyAnalyticsDto,
} from "@/features/social/types";
import { useEventuallyConsistentQuery } from "@/features/social/hooks/useEventuallyConsistentQuery";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";
import type { ApiError } from "@/lib/api";

export interface UseMySocialAnalyticsResult {
  analytics: SocialMyAnalyticsDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => void;
  staleness: ConsistencyStaleness;
}

const SAFE_FALLBACK: UseMySocialAnalyticsResult = Object.freeze({
  analytics: null,
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => undefined,
  staleness: "fresh",
});

/**
 * Read the viewer's deep social analytics for the given period.
 */
export function useMySocialAnalytics(
  period: AnalyticsPeriod,
): UseMySocialAnalyticsResult {
  const flagValue = getFeatureFlagValue("phase6_social");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    return ["social", "v1", "my-analytics", period] as const;
  }, [isFlagPlaceholder, isAuthenticated, period]);

  const fetcher = useCallback(async (): Promise<SocialMyAnalyticsDto> => {
    const envelope = await getMySocialAnalytics();
    return toSocialMyAnalyticsFromEnvelope(envelope);
  }, []);

  const result = useEventuallyConsistentQuery<SocialMyAnalyticsDto>(
    key,
    fetcher,
  );

  if (isFlagPlaceholder) return SAFE_FALLBACK;
  if (!isAuthenticated) return SAFE_FALLBACK;

  return {
    analytics: result.data,
    isLoading: result.isLoading,
    isStale: result.isStale,
    error: result.error,
    retry: result.retry,
    staleness: result.staleness,
  };
}