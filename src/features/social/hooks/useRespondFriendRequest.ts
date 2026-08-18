"use client";
import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
respondFriendRequest,
type RespondFriendRequestAction,
} from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
export type RespondFriendRequestErrorCode =
| SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

export interface UseRespondFriendRequestInput {
readonly friendshipId: string;
readonly action: RespondFriendRequestAction;
}

export interface UseRespondFriendRequestResult {
respond: (input: UseRespondFriendRequestInput) => void;
isPending: boolean;
error: RespondFriendRequestErrorCode | null;
}

export interface UseRespondFriendRequestOptions {
currentUserId?: string | null;
assumeCanRespond?: boolean;
}

const COOLDOWN_MS = 500;

function classifyRespondFriendRequestError(
cause: unknown,
): RespondFriendRequestErrorCode {
if (cause instanceof ApiError) {
return (
(cause.code as RespondFriendRequestErrorCode) ?? "GLOBAL_INTERNAL_ERROR"
    );
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useRespondFriendRequest(
targetUserId: string | null,
options: UseRespondFriendRequestOptions = {},
): UseRespondFriendRequestResult {
const flagValue = getFeatureFlagValue("social_friend_request_mutation_live");
const isFlagPlaceholder = flagValue === "placeholder";

const permissions = useSocialPermissions(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const { mutate } = useSWRConfig();

const {
mutate: dispatchMutation,
isInFlight,
lastResult,
  } = useOptimisticMutation();

const revalidate = useCallback(
async (userId: string): Promise<void> => {
await Promise.all([
mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
revalidate: true,
        }),
mutate(SOCIAL_CACHE_KEYS.makeIncomingRequestsKey(), undefined, {
revalidate: true,
        }),
mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
revalidate: true,
        }),
      ]);
    },
[mutate],
  );

const error: RespondFriendRequestErrorCode | null =
lastResult && lastResult.status === "reverted"
? classifyRespondFriendRequestError(lastResult.apiError)
: null;

const result = useMemo<UseRespondFriendRequestResult>(() => {
if (isFlagPlaceholder) {
return Object.freeze({
respond: () => {},
isPending: false,
error: null,
      });
    }

if (targetUserId === null) {
return Object.freeze({
respond: () => {},
isPending: false,
error: null,
      });
    }

if (!options.assumeCanRespond && !permissions.canRespond) {
return Object.freeze({
respond: () => {},
isPending: false,
error: null,
      });
    }

const respond = (input: UseRespondFriendRequestInput): void => {
void dispatchMutation({
key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
optimisticData: <TData>(
current: TData | undefined,
        ): TData | undefined => current,
run: async () => {
await respondFriendRequest(input.friendshipId, input.action);
await revalidate(targetUserId);
        },
cooldownMs: COOLDOWN_MS,
      });
    };

return Object.freeze({
respond,
isPending: isInFlight,
error,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canRespond,
options.assumeCanRespond,
dispatchMutation,
isInFlight,
error,
revalidate,
  ]);

return result;
}
