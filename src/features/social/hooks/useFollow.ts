"use client";

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { followUser } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

export type FollowErrorCode =
| SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

export interface UseFollowResult {
follow: () => void;
isPending: boolean;
error: FollowErrorCode | null;
}

export interface UseFollowOptions {

currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

function classifyFollowError(cause: unknown): FollowErrorCode {
if (cause instanceof ApiError) {
return (cause.code as FollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useFollow(
targetUserId: string | null,
options: UseFollowOptions = {},
): UseFollowResult {

const flagValue = getFeatureFlagValue("social_follow_mutation_live");
const isFlagPlaceholder = flagValue === "placeholder";

const permissions = useSocialPermissions(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const { mutate } = useSWRConfig();

const { mutate: dispatchMutation, isInFlight, lastResult } =
useOptimisticMutation();

const revalidate = useCallback(
async (userId: string): Promise<void> => {
await Promise.all([
mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
revalidate: true,
        }),
mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
revalidate: true,
        }),
      ]);
    },
[mutate],
  );

const error: FollowErrorCode | null =
lastResult && lastResult.status === "reverted"
? classifyFollowError(lastResult.apiError)
: null;

const result = useMemo<UseFollowResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
follow: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
      });
    }

if (targetUserId === null) {
return Object.freeze({
follow: () => {
          // no-op
        },
isPending: false,
error: null,
      });
    }

if (!permissions.canFollow) {
return Object.freeze({
follow: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
      });
    }

const follow = (): void => {

void dispatchMutation({

key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
run: async () => {
await followUser(targetUserId);
await revalidate(targetUserId);

publishSocialRelationshipInvalidation({
kind: "follow.changed",
userId: targetUserId,
          });
        },
cooldownMs: COOLDOWN_MS,
      });
    };

return Object.freeze({
follow,
isPending: isInFlight,
error,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canFollow,
dispatchMutation,
isInFlight,
error,
revalidate,
  ]);

return result;
}