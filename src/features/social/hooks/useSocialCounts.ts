"use client";

import { useCallback, useMemo } from "react";

import { useSingleWithRetry } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toSocialCounts } from "@/features/social/dto-adapters";
import { getSocialCounts } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialCountsDto,
type SocialErrorCode,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseSocialCountsResult {
counts: SocialCountsDto | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
retry: () => Promise<void>;
}

const PLACEHOLDER_RESULT: UseSocialCountsResult = Object.freeze({
counts: null,
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
});

export function useSocialCounts(userId: string | null): UseSocialCountsResult {
const flagValue = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
if (userId === null) return null;
return SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId);
  }, [isFlagPlaceholder, isAuthenticated, userId]);

const fetcher = useCallback(
async (): Promise<SocialCountsDto> => {

if (isFlagPlaceholder) return toSocialCounts({});
if (!isAuthenticated) return toSocialCounts({});
try {
const envelope = await getSocialCounts();
return toSocialCounts(envelope?.data);
      } catch (err) {

const apiErr = err as Partial<ApiError> | null;
if (apiErr && (apiErr.code === "GLOBAL_NOT_FOUND" || apiErr.status === 404)) {
return toSocialCounts({});
        }
throw err;
      }
    },
[isFlagPlaceholder, isAuthenticated],
  );

const result = useSingleWithRetry<SocialCountsDto>({ key, fetcher });

const retry = useCallback(async () => {
await result.retry();
  }, [result]);

const mappedError = useMemo<ApiError | null>(() => {
if (result.error === null) return null;
return result.error;
  }, [result.error]);

if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
if (!isAuthenticated) return PLACEHOLDER_RESULT;
if (userId === null) return PLACEHOLDER_RESULT;

return {
counts: result.data ?? null,
isLoading: result.isLoading,
isStale: false,
error: mappedError,
retry,
  };
}

export type SocialCountsErrorCode = SocialErrorCode;
