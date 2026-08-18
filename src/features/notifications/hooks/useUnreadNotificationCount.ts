"use client";

import { useEffect, useMemo, useRef } from "react";
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

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export interface UseUnreadNotificationCountResult {
unreadCount: number;
isLoading: boolean;
error: ApiError | null;
}

type GetUnreadCountWireResponse = UnreadCount;

export function useUnreadNotificationCount(): UseUnreadNotificationCountResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isFlagPlaceholder = flagValue === "placeholder";
const realtimeEnabled = !isFlagPlaceholder;

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

revalidateOnFocus: false,
revalidateOnReconnect: true,
dedupingInterval: 1_000,
    },
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

void swr.mutate(undefined, { revalidate: true });
return;
      }

const seenAt = seenIdsRef.current.get(id);
if (typeof seenAt === "number" && seenAt > Date.now() - DEDUPE_WINDOW_MS) {
return;
      }
seenIdsRef.current.set(id, Date.now());

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

useRealtimeEvent(
socket,
realtimeEnabled ? NOTIFICATION_READ : null,
() => {
void swr.mutate(undefined, { revalidate: true });
    },
{ enabled: isLiveSocket },
  );

useRealtimeEvent(
socket,
realtimeEnabled ? NOTIFICATION_DELETED : null,
() => {
void swr.mutate(undefined, { revalidate: true });
    },
{ enabled: isLiveSocket },
  );

const unreadCount = Math.max(0, swr.data?.count ?? 0);

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
