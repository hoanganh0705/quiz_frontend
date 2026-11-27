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
  cancel: (friendshipId: string) => Promise<boolean>;
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
  const [isPending, setIsPending] = useState(false);

  const [error, setError] = useState<CancelFriendRequestErrorCode | null>(null);
  const [alreadyCancelled, setAlreadyCancelled] = useState(false);

  const assumeCanCancel = options.assumeCanCancel === true;
  const result = useMemo<UseCancelFriendRequestResult>(() => {
    if (targetUserId === null) {
      return Object.freeze({
        cancel: async () => false,
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    if (!assumeCanCancel && !permissions.canCancelRequest) {
      return Object.freeze({
        cancel: async () => false,
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    const cancel = async (friendshipId: string): Promise<boolean> => {
      if (typeof friendshipId !== "string" || friendshipId.length === 0) {
        return false;
      }

      if (isPendingRef.current) return false;

      isPendingRef.current = true;
      setIsPending(true);
      setError(null);
      setAlreadyCancelled(false);

      try {
        await cancelFriendRequest(friendshipId);
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
        return true;
      } catch (err: unknown) {
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
          return true;
        }

        const code: CancelFriendRequestErrorCode =
          (apiErr.code as CancelFriendRequestErrorCode) ??
          "GLOBAL_INTERNAL_ERROR";
        setError(code);
        return false;
      } finally {
        isPendingRef.current = false;
        setIsPending(false);
      }
    };

    return Object.freeze({
      cancel,
      isPending,
      error,
      alreadyCancelled,
    });
  }, [
    targetUserId,
    assumeCanCancel,
    permissions.canCancelRequest,
    isPending,
    error,
    alreadyCancelled,
  ]);

  return result;
}
