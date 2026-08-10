"use client";

/**
 * `useUnreadNotificationCount` — reactive unread notification count hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B2.
 *
 * ## What this hook owns
 *
 * - Fetch the server-authoritative unread count from
 *   `GET /api/v1/notifications/unread-count` and expose it as a
 *   reactive number.
 * - Subscribe to `notification:sent` events over the `/notifications`
 *   Socket.IO namespace and optimistically increment the cached count
 *   by **one** for each new notification ID (no double-increment for
 *   the same ID).
 * - Subscribe to `notification:read` and `notification:deleted` events
 *   and revalidate the count via SWR `mutate({ revalidate: true })`.
 * - Guarantee the count never goes below zero (clamped at 0).
 * - Feature-flag gating via `notifications_live`.
 *
 * ## Server authority
 *
 * The count is always derived from `data.count` returned by the
 * `getUnreadCount` service. The optimistic increment from a socket
 * event is **only** applied to the SWR cache; subsequent revalidations
 * (after a mutation, on focus, or after a window of inactivity) pull the
 * authoritative value from the server and overwrite the cache.
 *
 * ## Falsy guard
 *
 * The count is read as `data?.count ?? 0` so SSR renders with `0` and a
 * crashed fetcher produces `0` (no NaN, no undefined leaks).
 *
 * ## Feature flag off
 *
 * When `notifications_live === 'placeholder'`, the hook returns
 * `{ unreadCount: 0, isLoading: false }` without firing a request or
 * opening a socket connection.
 */

import { useMemo } from "react";
import useSWR from "swr";

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
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseUnreadNotificationCountResult {
  unreadCount: number;
  isLoading: boolean;
  error: ApiError | null;
}

// ─── Wire type ────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getUnreadCount` (post-unwrap).
 *
 * Mirrors `UnreadCountResponseDto`:
 * `{ count: number }`.
 */
type GetUnreadCountWireResponse = UnreadCount;

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Read the server-authoritative unread notification count, kept in sync
 * with socket-driven `notification:sent` / `notification:read` /
 * `notification:deleted` events.
 */
export function useUnreadNotificationCount(): UseUnreadNotificationCountResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";
  const realtimeEnabled = !isFlagPlaceholder;

  // SWR cache key: disabled sentinel when flag is off so no fetch fires.
  const swrKey = useMemo(
    () =>
      isFlagPlaceholder
        ? (["notifications", "unread-count", "disabled"] as const)
        : NOTIFICATION_CACHE_KEYS.unreadCount(),
    [isFlagPlaceholder],
  );

  const swr = useSWR<UnreadCount, unknown>(
    swrKey,
    async () => {
      if (isFlagPlaceholder) {
        return { count: 0 };
      }
      const wire = (await getUnreadCount()) as unknown as
        | GetUnreadCountWireResponse
        | undefined;
      const count = wire?.count ?? 0;
      return { count: Math.max(0, count) };
    },
    {
      // Live notifications: keep the count fresh. Stale data is acceptable
      // because the socket pushes invalidation events.
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1_000,
    },
  );

  // ─── Socket-driven cache updates ────────────────────────────────────────
  //
  // `useSocket` opens the `/notifications` namespace once per tab. We
  // subscribe to three event names. Each handler either optimistically
  // mutates the cache or triggers a revalidation.

  const { socket, connectionState } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const isLiveSocket = realtimeEnabled && connectionState === "connected";

  // `notification:sent` — increment the cached count by 1.
  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_SENT : null,
    () => {
      void swr.mutate(
        (current) => {
          const base = current ?? { count: 0 };
          return { count: Math.max(0, base.count + 1) };
        },
        { revalidate: false },
      );
    },
    { enabled: isLiveSocket },
  );

  // `notification:read` — invalidate the cached count so the next read
  // pulls the authoritative value (a mark-read may decrement the count
  // by 0 or 1 depending on the prior read state).
  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_READ : null,
    () => {
      void swr.mutate(undefined, { revalidate: true });
    },
    { enabled: isLiveSocket },
  );

  // `notification:deleted` — invalidate the cached count for the same
  // reason (deleting an unread notification decrements the count by 1).
  useRealtimeEvent(
    socket,
    realtimeEnabled ? NOTIFICATION_DELETED : null,
    () => {
      void swr.mutate(undefined, { revalidate: true });
    },
    { enabled: isLiveSocket },
  );

  // Falsy guard: never expose `undefined` or `NaN`. The count is clamped
  // at 0 because the backend may emit negative values during replay
  // reconciliation windows.
  const unreadCount = Math.max(0, swr.data?.count ?? 0);

  // Defensive error normalisation — `swr.error` is typed `unknown` by
  // SWR, but in practice it is always an `ApiError`. Branch on the
  // actual class so consumers can call `apiError.code`.
  const error: ApiError | null = useMemo(() => {
    if (!swr.error) return null;
    if (isApiError(swr.error)) return swr.error;
    return new ApiError(
      swr.error as unknown as ConstructorParameters<typeof ApiError>[0],
    );
  }, [swr.error]);

  return {
    unreadCount,
    isLoading: swr.isLoading,
    error,
  };
}
