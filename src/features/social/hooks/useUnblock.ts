"use client";

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { unblockUser } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export type UnblockErrorCode = SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

export interface UseUnblockResult {
unblock: () => void;
isPending: boolean;
error: UnblockErrorCode | null;
alreadyNotBlocking: boolean;
}

export interface UseUnblockOptions {

currentUserId?: string | null;
}

export function useUnblock(
targetUserId: string | null,
options: UseUnblockOptions = {},
): UseUnblockResult {

const flagValue = getFeatureFlagValue("social_block_mutation_live");
const isFlagPlaceholder = flagValue === "placeholder";

const permissions = useSocialPermissions(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const { mutate } = useSWRConfig();

const isPendingRef = useRef(false);

const [error, setError] = useState<UnblockErrorCode | null>(null);
const [alreadyNotBlocking, setAlreadyNotBlocking] = useState(false);

const result = useMemo<UseUnblockResult>(() => {

if (isFlagPlaceholder) {
return Object.freeze({
unblock: () => {
          // no-op — feature is gated off
        },
isPending: false,
error: null,
alreadyNotBlocking: false,
      });
    }

if (targetUserId === null) {
return Object.freeze({
unblock: () => {
          // no-op
        },
isPending: false,
error: null,
alreadyNotBlocking: false,
      });
    }

if (!permissions.canUnblock) {
return Object.freeze({
unblock: () => {
          // no-op — permission denied
        },
isPending: false,
error: null,
alreadyNotBlocking: false,
      });
    }

const unblock = (): void => {
if (isPendingRef.current) return;

isPendingRef.current = true;

setError(null);
setAlreadyNotBlocking(false);

unblockUser(targetUserId)
        .then(() => {

void mutate(
SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
undefined,
{ revalidate: true },
          );
void mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
revalidate: true,
          });
void mutate(
SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
undefined,
{ revalidate: true },
          );
        })
        .catch((err: unknown) => {
const apiErr =
err instanceof ApiError ? err : new ApiError(err as never);

if (apiErr.code === "SOCIAL_USER_NOT_BLOCKED") {
setAlreadyNotBlocking(true);

void mutate(
SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
undefined,
{ revalidate: true },
            );
void mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
revalidate: true,
            });
void mutate(
SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
undefined,
{ revalidate: true },
            );
return;
          }

const code: UnblockErrorCode =
(apiErr.code as UnblockErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
setError(code);
        })
        .finally(() => {
isPendingRef.current = false;
        });
    };

return Object.freeze({
unblock,
get isPending() {
return isPendingRef.current;
      },
error,
alreadyNotBlocking,
    });
  }, [
isFlagPlaceholder,
targetUserId,
permissions.canUnblock,
mutate,
error,
alreadyNotBlocking,
  ]);

return result;
}