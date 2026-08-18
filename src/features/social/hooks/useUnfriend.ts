"use client";

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { unfriend } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export type UnfriendErrorCode =
| SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

export interface UseUnfriendResult {
unfriend: () => void;
isPending: boolean;
error: UnfriendErrorCode | null;
alreadyNotFriends: boolean;
}

export interface UseUnfriendOptions {

currentUserId?: string | null;

assumeCanUnfriend?: boolean;
}

export function useUnfriend(
targetUserId: string | null,
options: UseUnfriendOptions = {},
): UseUnfriendResult {

const flagValue = getFeatureFlagValue(
"social_friend_request_mutation_live",
  );
const isFlagPlaceholder = flagValue === "placeholder";

const permissions = useSocialPermissions(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const { mutate } = useSWRConfig();

const isPendingRef = useRef(false);

const [error, setError] = useState<UnfriendErrorCode | null>(null);
const [alreadyNotFriends, setAlreadyNotFriends] = useState(false);

const result = useMemo<UseUnfriendResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
unfriend: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
alreadyNotFriends: false,
      });
    }

if (targetUserId === null) {
return Object.freeze({
unfriend: () => {
          // no-op
        },
isPending: false,
error: null,
alreadyNotFriends: false,
      });
    }

if (!options.assumeCanUnfriend && !permissions.canUnfriend) {
return Object.freeze({
unfriend: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
alreadyNotFriends: false,
      });
    }

const unfriendAction = (): void => {
if (isPendingRef.current) return;

isPendingRef.current = true;

setError(null);
setAlreadyNotFriends(false);

unfriend(targetUserId)
        .then(() => {

void mutate(
SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
undefined,
{ revalidate: true },
          );
void mutate(
SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
undefined,
{ revalidate: true },
          );
        })
        .catch((err: unknown) => {
const apiErr =
err instanceof ApiError ? err : new ApiError(err as never);

if (apiErr.code === "SOCIAL_FRIENDSHIP_NOT_FOUND") {
setAlreadyNotFriends(true);
void mutate(
SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
undefined,
{ revalidate: true },
            );
void mutate(
SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
undefined,
{ revalidate: true },
            );
return;
          }

const code: UnfriendErrorCode =
(apiErr.code as UnfriendErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
setError(code);
        })
        .finally(() => {
isPendingRef.current = false;
        });
    };

return Object.freeze({
unfriend: unfriendAction,
get isPending() {
return isPendingRef.current;
      },
error,
alreadyNotFriends,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canUnfriend,
options.assumeCanUnfriend,
mutate,
error,
alreadyNotFriends,
  ]);

return result;
}
