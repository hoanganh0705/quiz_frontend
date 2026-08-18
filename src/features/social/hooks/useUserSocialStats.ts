"use client";

import { useCallback, useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { toSocialUserStatsFromEnvelope } from "@/features/social/dto-adapters-analytics";
import { getUserSocialStats } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialUserStatsDto,
} from "@/features/social/types";
import { useEventuallyConsistentQuery } from "@/features/social/hooks/useEventuallyConsistentQuery";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { ApiError } from "@/lib/api";

export type UserSocialStatsVisibility =
| "visible"
  | "private"
  | "blocked_viewer"
  | "blocked_by_viewer"
  | "not_found";

export interface UseUserSocialStatsResult {
stats: SocialUserStatsDto | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
retry: () => void;
visibility: UserSocialStatsVisibility;
}

export function resolveUserSocialStatsVisibility(
code: string | undefined,
): UserSocialStatsVisibility {
if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
return "visible";
}

const PLACEHOLDER_RESULT: UseUserSocialStatsResult = Object.freeze({
stats: null,
isLoading: false,
isStale: false,
error: null,
retry: () => undefined,
visibility: "not_found",
});

const SELF_RESULT: UseUserSocialStatsResult = Object.freeze({
stats: null,
isLoading: false,
isStale: false,
error: null,
retry: () => undefined,
visibility: "visible",
});

export function useUserSocialStats(
userId: string,
): UseUserSocialStatsResult {
const flagValue = getFeatureFlagValue("social_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const viewerId = auth.currentUser?.userId ?? null;
const isAuthenticated = auth.isAuthenticated;
const isSelf = viewerId !== null && userId === viewerId;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
if (isSelf) return null;
return SOCIAL_CACHE_KEYS.makeUserSocialStatsKey(userId);
  }, [isFlagPlaceholder, isAuthenticated, isSelf, userId]);

const fetcher = useCallback(async (): Promise<SocialUserStatsDto> => {
const envelope = await getUserSocialStats(userId);
return toSocialUserStatsFromEnvelope(envelope);
  }, [userId]);

const result = useEventuallyConsistentQuery<SocialUserStatsDto>(
key,
fetcher,
  );

if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
if (isSelf) return SELF_RESULT;

const code = result.error?.code;
const visibility = resolveUserSocialStatsVisibility(code);

const error =
visibility !== "visible" && result.error !== null ? null : result.error;
const stats = visibility !== "visible" ? null : result.data;

return {
stats,
isLoading: result.isLoading,
isStale: result.isStale,
error,
retry: result.retry,
visibility,
  };
}