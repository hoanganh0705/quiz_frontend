"use client";

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

export function useMySocialAnalytics(
period: AnalyticsPeriod,
): UseMySocialAnalyticsResult {
const flagValue = getFeatureFlagValue("social_live");
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