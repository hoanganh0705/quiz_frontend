"use client";

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { unblockUser } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialErrorCode,
} from "@/features/social/types";
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
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  const isPendingRef = useRef(false);

  const [error, setError] = useState<UnblockErrorCode | null>(null);
  const [alreadyNotBlocking, setAlreadyNotBlocking] = useState(false);

  const result = useMemo<UseUnblockResult>(() => {
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
          const qc = getQueryClient();
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
          });
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeBlockedKey(),
          });
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
          });
        })
        .catch((err: unknown) => {
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);

          if (apiErr.code === "SOCIAL_USER_NOT_BLOCKED") {
            setAlreadyNotBlocking(true);

            const qc = getQueryClient();
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
            });
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeBlockedKey(),
            });
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
            });
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
  }, [targetUserId,
    permissions.canUnblock,
    error,
    alreadyNotBlocking,
  ]);

  return result;
}
