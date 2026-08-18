"use client";

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { sendFriendRequest } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export type SendFriendRequestErrorCode =
| SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

export interface UseSendFriendRequestResult {
send: () => void;
isPending: boolean;
error: SendFriendRequestErrorCode | null;
}

export interface UseSendFriendRequestOptions {

currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

function classifySendFriendRequestError(
cause: unknown,
): SendFriendRequestErrorCode {
if (cause instanceof ApiError) {
return (cause.code as SendFriendRequestErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useSendFriendRequest(
targetUserId: string | null,
options: UseSendFriendRequestOptions = {},
): UseSendFriendRequestResult {

const flagValue = getFeatureFlagValue(
"social_friend_request_mutation_live",
  );
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
mutate(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(), undefined, {
revalidate: true,
        }),
mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
revalidate: true,
        }),
      ]);
    },
[mutate],
  );

const error: SendFriendRequestErrorCode | null =
lastResult && lastResult.status === "reverted"
? classifySendFriendRequestError(lastResult.apiError)
: null;

const result = useMemo<UseSendFriendRequestResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
send: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
      });
    }

if (targetUserId === null) {
return Object.freeze({
send: () => {
          // no-op
        },
isPending: false,
error: null,
      });
    }

if (!permissions.canFriendRequest) {
return Object.freeze({
send: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
      });
    }

const send = (): void => {
void dispatchMutation({
key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
run: async () => {
await sendFriendRequest(targetUserId);
await revalidate(targetUserId);
        },
cooldownMs: COOLDOWN_MS,
      });
    };

return Object.freeze({
send,
isPending: isInFlight,
error,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canFriendRequest,
dispatchMutation,
isInFlight,
error,
revalidate,
  ]);

return result;
}