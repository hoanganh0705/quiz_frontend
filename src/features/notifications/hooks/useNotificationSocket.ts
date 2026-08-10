"use client";

/**
 * `useNotificationSocket` — connection + listener hook for the `/notifications`
 * Socket.IO namespace.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B3.
 *
 * ## What this hook owns
 *
 * - Open an authenticated Socket.IO connection to the `/notifications`
 *   namespace while `notifications_live === 'live'`. When the flag is
 *   `'placeholder'`, the connection is suppressed entirely (no socket
 *   handshake, no listeners, no automatic reconnection).
 * - Expose the live socket, the connection state, and the last WS error
 *   so consumers (`NotificationBell`, `NotificationPopover`,
 *   `NotificationCenterPage`) can react to lifecycle transitions.
 * - Forward `notification:sent` / `notification:read` /
 *   `notification:deleted` events through `useRealtimeEvent` and
 *   revalidate the matching SWR cache key (the notification list and
 *   the unread-count singleton) when the message is delivered.
 * - Broadcast a Phase 5 cross-tab invalidation event on every
 *   `notification:sent` so sibling tabs refetch without each opening a
 *   socket.
 *
 * ## Feature flag preconditions
 *
 * This hook requires `realtime_infrastructure_live === 'live'`. When
 * either flag is `'placeholder'`, the socket connection is
 * suppressed and the hook returns a `'idle'` connection state.
 *
 * ## Mounted once
 *
 * The connection is owned by `useSocket`'s internal singleton
 * (`ConnectionRegistry`) — calling this hook from multiple components
 * does NOT open multiple sockets. The hook is safe to mount from the
 * `NotificationBell`, the `NotificationPopover`, and the
 * `NotificationCenterPage` simultaneously.
 *
 * ## Auth
 *
 * The Socket.IO handshake uses the auth token from the cookie (see
 * `useSocket`). When the token is absent, the connect attempt fails
 * with an `auth_required` state and the hook stops retrying.
 */

import { useCallback, useEffect } from "react";
import { mutate as globalMutate } from "swr";

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

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseNotificationSocketResult {
  /** Whether the socket is currently usable (connected and authenticated). */
  isLive: boolean;
  /** The connection state machine value. */
  connectionState: UseSocketReturn["connectionState"];
  /** The raw socket instance — exposed for advanced consumers. */
  socket: UseSocketReturn["socket"];
  /** The last WS error, if any. */
  error: UseSocketReturn["error"];
  /** Manually trigger a reconnect. */
  reconnect: UseSocketReturn["reconnect"];
  /** Manually disconnect and stop retrying. */
  disconnect: UseSocketReturn["disconnect"];
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Manage the notifications socket and forward invalidation events to
 * the SWR caches owned by `useNotifications` and
 * `useUnreadNotificationCount`.
 */
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

  // ─── Forward socket events to SWR cache invalidation ──────────────────
  //
  // We revalidate the **`list`** and **`unread-count`** SWR keys when
  // the server pushes a matching event. Cross-tab invalidation is
  // emitted alongside the local revalidation so sibling tabs refresh
  // without opening their own sockets.
  //
  // The handlers are stable per render via `useCallback` so the
  // `useRealtimeEvent` listener registration does not thrash.

  const handleSent = useCallback(() => {
    void globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
      revalidate: true,
    });
    // The list page's filter shape may be anything; invalidate every
    // SWR key starting with `["notifications", "list"]`. The wildcard
    // form revalidates every page in the list cache.
    void globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "notifications" &&
        key[1] === "list",
      undefined,
      { revalidate: true },
    );
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  const handleRead = useCallback(() => {
    void globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
      revalidate: true,
    });
    void globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "notifications" &&
        key[1] === "list",
      undefined,
      { revalidate: true },
    );
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  const handleDeleted = useCallback(() => {
    void globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
      revalidate: true,
    });
    void globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "notifications" &&
        key[1] === "list",
      undefined,
      { revalidate: true },
    );
    emitPhase5Invalidation({ type: "notification" });
  }, []);

  // Register listeners through `useRealtimeEvent`. The hook opens and
  // closes the `socket.on(...)` subscriptions — we just supply the
  // event name and the handler.
  useRealtimeEvent(socket, enabled ? NOTIFICATION_SENT : null, handleSent, {
    enabled: enabled && connectionState === "connected",
  });
  useRealtimeEvent(socket, enabled ? NOTIFICATION_READ : null, handleRead, {
    enabled: enabled && connectionState === "connected",
  });
  useRealtimeEvent(socket, enabled ? NOTIFICATION_DELETED : null, handleDeleted, {
    enabled: enabled && connectionState === "connected",
  });

  // Cross-tab listener — when a sibling tab broadcasts a
  // Phase 5 notification invalidation, refetch the local caches.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("realtime/invalidation");
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: string };
      if (data?.type !== "notification") return;
      void globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
        revalidate: true,
      });
      void globalMutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "notifications" &&
          key[1] === "list",
        undefined,
        { revalidate: true },
      );
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
