"use client";

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { cancelFriendRequest } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export type CancelFriendRequestErrorCode =
  SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

export interface UseCancelFriendRequestResult {
  cancel: (friendshipId: string) => void;
  isPending: boolean;
  error: CancelFriendRequestErrorCode | null;
  alreadyCancelled: boolean;
}

export interface UseCancelFriendRequestOptions {
  currentUserId?: string | null;

  assumeCanCancel?: boolean;
}

export function useCancelFriendRequest(
  targetUserId: string | null,
  options: UseCancelFriendRequestOptions = {},
): UseCancelFriendRequestResult {
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  const isPendingRef = useRef(false);

  const [error, setError] = useState<CancelFriendRequestErrorCode | null>(null);
  const [alreadyCancelled, setAlreadyCancelled] = useState(false);

  const assumeCanCancel = options.assumeCanCancel === true;
  const result = useMemo<UseCancelFriendRequestResult>(() => {
    if (false) {
      return Object.freeze({
        cancel: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    if (targetUserId === null) {
      return Object.freeze({
        cancel: () => {
          // no-op
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    if (!assumeCanCancel && !permissions.canCancelRequest) {
      return Object.freeze({
        cancel: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    const cancel = (friendshipId: string): void => {
      if (typeof friendshipId !== "string" || friendshipId.length === 0) {
        return;
      }

      if (isPendingRef.current) return;

      isPendingRef.current = true;
      setError(null);
      setAlreadyCancelled(false);

      cancelFriendRequest(friendshipId)
        .then(() => {
          const qc = getQueryClient();
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
          });
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
          });
          void qc.invalidateQueries({
            queryKey: SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
          });
          void qc.invalidateQueries({
            queryKey: ["social", "user-search"],
          });
          void qc.invalidateQueries({
            queryKey: ["social", "v1", "user-search"],
          });
        })
        .catch((err: unknown) => {
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);

          if (apiErr.code === "SOCIAL_FRIEND_REQUEST_NOT_FOUND") {
            setAlreadyCancelled(true);

            const qc = getQueryClient();
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
            });
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
            });
            void qc.invalidateQueries({
              queryKey: SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
            });
            void qc.invalidateQueries({
              queryKey: ["social", "user-search"],
            });
            void qc.invalidateQueries({
              queryKey: ["social", "v1", "user-search"],
            });
            return;
          }

          const code: CancelFriendRequestErrorCode =
            (apiErr.code as CancelFriendRequestErrorCode) ??
            "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      cancel,
      get isPending() {
        return isPendingRef.current;
      },
      error,
      alreadyCancelled,
    });
  }, [targetUserId,
    assumeCanCancel,
    permissions.canCancelRequest,
    error,
    alreadyCancelled,
  ]);

  return result;
}
