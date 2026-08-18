"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { unfollowUser } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

export type UnfollowErrorCode =
| SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

export interface UseUnfollowResult {
unfollow: () => void;
isPending: boolean;
error: UnfollowErrorCode | null;
alreadyNotFollowing: boolean;
}

export interface UseUnfollowOptions {

currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

const SOCIAL_FOLLOW_NOT_FOUND = "SOCIAL_FOLLOW_NOT_FOUND" as const;

function classifyUnfollowError(cause: unknown): UnfollowErrorCode {
if (cause instanceof ApiError) {
return (cause.code as UnfollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useUnfollow(
targetUserId: string | null,
options: UseUnfollowOptions = {},
): UseUnfollowResult {

const flagValue = getFeatureFlagValue("social_follow_mutation_live");
const isFlagPlaceholder = flagValue === "placeholder";

const permissions = useSocialPermissions(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const { mutate } = useSWRConfig();

const { mutate: dispatchMutation, isInFlight, lastResult } =
useOptimisticMutation();

const [alreadyNotFollowing, setAlreadyNotFollowing] = useState(false);

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

useEffect(() => {
if (lastResult?.status === "pending") {
setAlreadyNotFollowing(false);
    }
  }, [lastResult]);

const error: UnfollowErrorCode | null =
lastResult && lastResult.status === "reverted"
? classifyUnfollowError(lastResult.apiError)
: null;

const result = useMemo<UseUnfollowResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
unfollow: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
alreadyNotFollowing: false,
      });
    }

if (targetUserId === null) {
return Object.freeze({
unfollow: () => {
          // no-op
        },
isPending: false,
error: null,
alreadyNotFollowing: false,
      });
    }

if (!permissions.canUnfollow) {
return Object.freeze({
unfollow: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
alreadyNotFollowing: false,
      });
    }

const unfollow = (): void => {
void dispatchMutation({
key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
run: async () => {
try {
await unfollowUser(targetUserId);
          } catch (cause) {

if (
cause instanceof ApiError &&
cause.code === SOCIAL_FOLLOW_NOT_FOUND
            ) {
setAlreadyNotFollowing(true);
await revalidate(targetUserId);
publishSocialRelationshipInvalidation({
kind: "follow.changed",
userId: targetUserId,
              });
return undefined;
            }
throw cause;
          }
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
unfollow,
isPending: isInFlight,
error,
alreadyNotFollowing,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canUnfollow,
dispatchMutation,
isInFlight,
error,
alreadyNotFollowing,
revalidate,
  ]);

return result;
}