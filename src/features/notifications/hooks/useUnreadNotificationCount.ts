"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import {
  NOTIFICATIONS_NAMESPACE,
  NOTIFICATION_SENT,
  NOTIFICATION_READ,
  NOTIFICATION_DELETED,
  useRealtimeEvent,
  useSocket,
} from "@/lib/realtime";

import { getUnreadCount } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type UnreadCount,
} from "@/features/notifications/types/notification.types";

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export interface UseUnreadNotificationCountResult {
  unreadCount: number;
  isLoading: boolean;
  error: ApiError | null;
}

type GetUnreadCountWireResponse = UnreadCount;

export function useUnreadNotificationCount(): UseUnreadNotificationCountResult {
  const realtimeEnabled = !false;

  const queryKey = useMemo(
    () =>
      NOTIFICATION_CACHE_KEYS.unreadCount(),
    [],
  );

  const { data, error, isLoading, refetch } = useQuery<UnreadCount, unknown>(
    {
      queryKey,
      queryFn: async () => {
        if (false) {
          return { count: 0 };
        }
        const wire = (await getUnreadCount()) as unknown as
          GetUnreadCountWireResponse | undefined;
        const count = wire?.count ?? 0;
        return { count: Math.max(0, count) };
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 1_000,
    },
    getQueryClient(),
  );

  const { socket, connectionState } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const isLiveSocket = realtimeEnabled && connectionState === "connected";

  const seenIdsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!realtimeEnabled) return;
    const interval = window.setInterval(() => {
      const cutoff = Date.now() - DEDUPE_WINDOW_MS;
      const map = seenIdsRef.current;
      for (const [id, ts] of map) {
        if (ts < cutoff) {
          map.delete(id);
        }
      }
    }, DEDUPE_WINDOW_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [realtimeEnabled]);

  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_SENT : null,
    (rawPayload) => {
      const payload = rawPayload as { notificationId?: unknown } | undefined;
      const id =
        payload && typeof payload === "object"
          ? payload.notificationId
          : undefined;
      if (typeof id !== "string" || id.length === 0) {
        void refetch();
        return;
      }

      const seenAt = seenIdsRef.current.get(id);
      if (
        typeof seenAt === "number" &&
        seenAt > Date.now() - DEDUPE_WINDOW_MS
      ) {
        return;
      }
      seenIdsRef.current.set(id, Date.now());

      getQueryClient().setQueryData<UnreadCount>(queryKey, (current) => {
        const base = current ?? { count: 0 };
        return { count: Math.max(0, base.count + 1) };
      });
    },
    { enabled: isLiveSocket },
  );

  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_READ : null,
    () => {
      void refetch();
    },
    { enabled: isLiveSocket },
  );

  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_DELETED : null,
    () => {
      void refetch();
    },
    { enabled: isLiveSocket },
  );

  const unreadCount = Math.max(0, data?.count ?? 0);

  const coercedError: ApiError | null = useMemo(() => {
    if (!error) return null;
    if (isApiError(error)) return error;
    return new ApiError(
      error as unknown as ConstructorParameters<typeof ApiError>[0],
    );
  }, [error]);

  return {
    unreadCount,
    isLoading: isLoading && !error,
    error: coercedError,
  };
}
