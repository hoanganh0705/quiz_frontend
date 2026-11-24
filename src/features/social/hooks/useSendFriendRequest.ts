"use client";

import { useCallback, useMemo } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, useOptimisticMutation } from "@/lib/api";

import { sendFriendRequest } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export type SendFriendRequestErrorCode =
  SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

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
    return (
      (cause.code as SendFriendRequestErrorCode) ?? "GLOBAL_INTERNAL_ERROR"
    );
  }
  return "GLOBAL_INTERNAL_ERROR";
}

export function useSendFriendRequest(
  targetUserId: string | null,
  options: UseSendFriendRequestOptions = {},
): UseSendFriendRequestResult {
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  const {
    mutate: dispatchMutation,
    isInFlight,
    lastResult,
  } = useOptimisticMutation();

  const revalidate = useCallback(
    async (userId: string): Promise<void> => {
      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({
          queryKey: SOCIAL_CACHE_KEYS.makeRelationshipKey(userId),
        }),
        qc.invalidateQueries({
          queryKey: SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
        }),
        qc.invalidateQueries({
          queryKey: SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId),
        }),
        qc.invalidateQueries({
          queryKey: ["social", "user-search"],
        }),
        qc.invalidateQueries({
          queryKey: ["social", "v1", "user-search"],
        }),
      ]);
    },
    [],
  );

  const error: SendFriendRequestErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifySendFriendRequestError(lastResult.apiError)
      : null;

  const result = useMemo<UseSendFriendRequestResult>(() => {
    if (false) {
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
        optimisticData: <TData>(
          current: TData | undefined,
        ): TData | undefined => current,
        run: async () => {
          try {
            await sendFriendRequest(targetUserId);
          } catch (err: unknown) {
            const apiErr =
              err instanceof ApiError
                ? err
                : (err as { status?: number; code?: string; message?: string });
            const status = apiErr?.status;
            const code = apiErr?.code;
            const message = apiErr?.message ?? "";
            if (
              status === 409 ||
              code === "SOCIAL_PENDING_REQUEST_EXISTS" ||
              message.includes("already pending")
            ) {
              await revalidate(targetUserId);
              return;
            }
            throw err;
          }
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
  }, [targetUserId,
    permissions.canFriendRequest,
    dispatchMutation,
    isInFlight,
    error,
    revalidate,
  ]);

  return result;
}
