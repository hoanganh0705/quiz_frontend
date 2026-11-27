"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { deleteAllNotifications } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";

export interface UseDeleteAllNotificationsResult {
  deleteAll: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useDeleteAllNotifications(): UseDeleteAllNotificationsResult {
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const deleteAll = useCallback(async (): Promise<void> => {
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
            pages: Array<{ items?: unknown[] }>;
            pageParams: unknown[];
          };
          return {
            ...inf,
            pages: inf.pages.map((page) => ({
              ...page,
              items: [],
            })),
          };
        }
        const page = current as { items?: unknown[] };
        if (!page.items) return current;
        return {
          ...page,
          items: [],
        };
      },
    );

    qc.setQueriesData(
      { queryKey: NOTIFICATION_CACHE_KEYS.unreadCount() },
      (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        return {
          ...current,
          count: 0,
        };
      },
    );

    try {
      await deleteAllNotifications();

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
      void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
      void qc.invalidateQueries({
        queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
      });

      setState("error");
      setError(coerceToApiError(cause));
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
    deleteAll,
    state,
    error,
    reset,
  };
}
