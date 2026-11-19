"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { deleteNotification } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type Notification,
  type NotificationListPage,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseDeleteNotificationResult {
  deleteNotification: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useDeleteNotification(
  notificationId: string | null,
): UseDeleteNotificationResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const swrConfig = useSWRConfig();

  const deleteNotificationAction = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || notificationId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    const matchedInfiniteKeys: string[] = [];
    try {
      const cache = swrConfig.cache as {
        keys?: () => IterableIterator<string>;
        get: (k: string) => { _k?: unknown; data?: unknown } | undefined;
      };
      const iter = cache.keys?.bind(cache);
      if (iter) {
        for (const cacheKey of iter()) {
          if (!cacheKey.startsWith("$inf$")) continue;
          const entry = cache.get(cacheKey);
          const data = entry?.data;
          if (!Array.isArray(data) || data.length === 0) continue;

          const firstPage = data[0] as { items?: unknown } | null;
          if (
            firstPage &&
            typeof firstPage === "object" &&
            "items" in firstPage
          ) {
            matchedInfiniteKeys.push(cacheKey);
          }
        }
      }
    } catch {
      // Fail-open
    }

    await globalMutate(
      (key) =>
        Array.isArray(key) && key[0] === "notifications" && key[1] === "list",
      (current: unknown) => {
        if (!current) return current;
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
      { revalidate: false },
    );

    try {
      await deleteNotification(notificationId);

      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications", "list"] }),
        qc.invalidateQueries({
          queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
        }),
        qc.invalidateQueries({
          queryKey: NOTIFICATION_CACHE_KEYS.detail(notificationId),
        }),
        ...matchedInfiniteKeys.map((cacheKey) =>
          swrConfig.mutate(cacheKey, undefined, { revalidate: true }),
        ),
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === "notifications" &&
            key[1] === "list",
          undefined,
          { revalidate: true },
        ),
        globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
          revalidate: true,
        }),
        globalMutate(
          NOTIFICATION_CACHE_KEYS.detail(notificationId),
          undefined,
          { revalidate: true },
        ),
      ]);

      setState("success");
      setError(null);

      setTimeout(() => {
        setState("idle");
      }, 1_000);
    } catch (cause: unknown) {
      const qc = getQueryClient();
      void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
      await globalMutate(
        (key) =>
          Array.isArray(key) && key[0] === "notifications" && key[1] === "list",
        undefined,
        { revalidate: true },
      );

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
  }, [isFlagPlaceholder, notificationId, state, swrConfig]);

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
