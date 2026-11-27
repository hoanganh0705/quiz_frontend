"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";

import { markNotificationUnread } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";

export interface UseMarkNotificationUnreadResult {
  markUnread: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useMarkNotificationUnread(
  notificationId: string | null,
): UseMarkNotificationUnreadResult {
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const markUnread = useCallback(async (): Promise<void> => {
    if (notificationId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await markNotificationUnread(notificationId);

      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications", "list"] }),
        qc.invalidateQueries({
          queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
        }),
        qc.invalidateQueries({
          queryKey: NOTIFICATION_CACHE_KEYS.detail(notificationId),
        }),
      ]);

      setState("success");
      setError(null);

      setTimeout(() => {
        setState("idle");
      }, 1_000);
    } catch (cause: unknown) {
      setState("error");
      setError(coerceToApiError(cause));
    } finally {
      inFlightRef.current = false;
    }
  }, [notificationId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    markUnread,
    state,
    error,
    reset,
  };
}
