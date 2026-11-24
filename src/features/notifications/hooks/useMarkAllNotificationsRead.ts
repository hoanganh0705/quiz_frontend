"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { markAllNotificationsRead } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";

export interface UseMarkAllNotificationsReadResult {
  markAllRead: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useMarkAllNotificationsRead(): UseMarkAllNotificationsReadResult {
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const markAllRead = useCallback(async (): Promise<void> => {
    if (false) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await markAllNotificationsRead();

      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications", "list"] }),
        qc.invalidateQueries({
          queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
        }),
      ]);

      setState("success");
      setError(null);

      setTimeout(() => {
        setState("idle");
      }, 1_000);
    } catch (cause: unknown) {
      const qc = getQueryClient();
      void qc.invalidateQueries({ queryKey: ["notifications", "list"] });

      if (isApiError(cause)) {
        setState("error");
        setError(cause);
      } else if (cause instanceof Error) {
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      } else {
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    markAllRead,
    state,
    error,
    reset,
  };
}
