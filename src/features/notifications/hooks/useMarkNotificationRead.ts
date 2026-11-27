"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";

import { markNotificationRead } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";

export interface UseMarkNotificationReadResult {
  markRead: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useMarkNotificationRead(
  notificationId: string | null,
): UseMarkNotificationReadResult {
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef(false);

  const markRead = useCallback(async (): Promise<void> => {
    if (!notificationId) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await markNotificationRead(notificationId);

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
    markRead,
    state,
    error,
    reset,
  };
}
