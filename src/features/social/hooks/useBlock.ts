"use client";

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
blockUser,
type BlockUserInput,
} from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

export type BlockErrorCode = SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

export type UseBlockInput = BlockUserInput;

export interface UseBlockResult {
block: (input?: UseBlockInput) => void;
isPending: boolean;
error: BlockErrorCode | null;
}

export interface UseBlockOptions {

currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

function classifyBlockError(cause: unknown): BlockErrorCode {
if (cause instanceof ApiError) {
return (cause.code as BlockErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useBlock(
targetUserId: string | null,
options: UseBlockOptions = {},
): UseBlockResult {

const flagValue = getFeatureFlagValue("social_block_mutation_live");
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
mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
revalidate: true,
        }),
mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
revalidate: true,
        }),
      ]);
    },
[mutate],
  );

const error: BlockErrorCode | null =
lastResult && lastResult.status === "reverted"
? classifyBlockError(lastResult.apiError)
: null;

const result = useMemo<UseBlockResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
block: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
      });
    }

if (targetUserId === null) {
return Object.freeze({
block: () => {
          // no-op
        },
isPending: false,
error: null,
      });
    }

if (!permissions.canBlock) {
return Object.freeze({
block: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
      });
    }

const block = (input: UseBlockInput = {}): void => {
void dispatchMutation({
key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
run: async () => {
await blockUser(targetUserId, input);
await revalidate(targetUserId);

publishSocialRelationshipInvalidation({
kind: "relationship.changed",
userId: targetUserId,
          });
publishSocialRelationshipInvalidation({
kind: "blocklist.changed",
userId: targetUserId,
          });
        },
cooldownMs: COOLDOWN_MS,
      });
    };

return Object.freeze({
block,
isPending: isInFlight,
error,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canBlock,
dispatchMutation,
isInFlight,
error,
revalidate,
  ]);

return result;
}