"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { deleteNotification } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type Notification,
  type NotificationListPage,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";

export interface UseDeleteNotificationResult {
  deleteNotification: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useDeleteNotification(
  notificationId: string | null,
): UseDeleteNotificationResult {
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const deleteNotificationAction = useCallback(async (): Promise<void> => {
    if (notificationId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    const qc = getQueryClient();
    qc.setQueriesData(
      { queryKey: ["notifications", "list"] },
      (current: unknown) => {
        if (!current) return current;
        if (
          typeof current === "object" &&
          current !== null &&
          "pages" in current
        ) {
          const inf = current as {
            pages: NotificationListPage[];
            pageParams: unknown[];
          };
          return {
            ...inf,
            pages: inf.pages.map((page) => ({
              ...page,
              items: (page.items ?? []).filter(
                (n: Notification) => n.id !== notificationId,
              ),
            })),
          };
        }
        const page = current as NotificationListPage;
        if (!page.items) return current;
        const filtered = page.items.filter(
          (n: Notification) => n.id !== notificationId,
        );
        if (filtered.length === page.items.length) return current;
        return {
          ...page,
          items: filtered,
        };
      },
    );

    try {
      await deleteNotification(notificationId);

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
  }, [notificationId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    deleteNotification: deleteNotificationAction,
    state,
    error,
    reset,
  };
}
