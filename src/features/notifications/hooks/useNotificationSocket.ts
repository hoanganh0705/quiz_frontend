"use client";

import { useCallback, useEffect } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { NOTIFICATIONS_NAMESPACE, useSocket } from "@/lib/realtime";
import {
  NOTIFICATION_SENT,
  NOTIFICATION_READ,
  NOTIFICATION_DELETED,
  useRealtimeEvent,
  emitPhase5Invalidation,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { NOTIFICATION_CACHE_KEYS } from "@/features/notifications/types/notification.types";

export interface UseNotificationSocketResult {
  isLive: boolean;
  connectionState: UseSocketReturn["connectionState"];
  socket: UseSocketReturn["socket"];
  error: UseSocketReturn["error"];
  reconnect: UseSocketReturn["reconnect"];
  disconnect: UseSocketReturn["disconnect"];
}

export function useNotificationSocket(): UseNotificationSocketResult {
  const notificationsFlag = getFeatureFlagValue("notifications_live");
  const realtimeFlag = getFeatureFlagValue("realtime_infrastructure_live");
  const notificationsLive = notificationsFlag === "live";
  const realtimeLive = realtimeFlag === "live";
  const enabled = notificationsLive && realtimeLive;

  const { socket, connectionState, error, reconnect, disconnect } = useSocket(
    NOTIFICATIONS_NAMESPACE,
    { autoConnect: enabled, enabled },
  );

  const isLive = enabled && connectionState === "connected";

  const handleSent = useCallback(() => {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
    });
    void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  const handleRead = useCallback(() => {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
    });
    void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  const handleDeleted = useCallback(() => {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
    });
    void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  useRealtimeEvent(socket, enabled ? NOTIFICATION_SENT : null, handleSent, {
    enabled: enabled && connectionState === "connected",
  });
  useRealtimeEvent(socket, enabled ? NOTIFICATION_READ : null, handleRead, {
    enabled: enabled && connectionState === "connected",
  });
  useRealtimeEvent(
    socket,
    enabled ? NOTIFICATION_DELETED : null,
    handleDeleted,
    {
      enabled: enabled && connectionState === "connected",
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("realtime/invalidation");
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: string };
      if (data?.type !== "notification") return;
      const qc = getQueryClient();
      void qc.invalidateQueries({
        queryKey: NOTIFICATION_CACHE_KEYS.unreadCount(),
      });
      void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    };
    channel.addEventListener("message", listener);
    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
    };
  }, []);

  return {
    isLive,
    connectionState,
    socket,
    error,
    reconnect,
    disconnect,
  };
}
