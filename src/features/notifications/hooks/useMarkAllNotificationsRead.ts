"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { markAllNotificationsRead } from "@/features/notifications/services/notifications.service";
import {
NOTIFICATION_CACHE_KEYS,
type Notification,
type NotificationListPage,
type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
buildNotificationListRevalidations,
findNotificationInfiniteKeys,
} from "@/features/notifications/utils/swr-infinite-cache";

export interface UseMarkAllNotificationsReadResult {
markAllRead: () => Promise<void>;
state: NotificationMutationState;
error: ApiError | null;
reset: () => void;
}

export function useMarkAllNotificationsRead(): UseMarkAllNotificationsReadResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [state, setState] = useState<NotificationMutationState>("idle");
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef(false);

const swrConfig = useSWRConfig();

const markAllRead = useCallback(async (): Promise<void> => {
if (isFlagPlaceholder) {
return;
    }

if (state === "pending" || inFlightRef.current) {
return;
    }

inFlightRef.current = true;
setState("pending");
setError(null);

await globalMutate(
(key) =>
Array.isArray(key) &&
key[0] === "notifications" &&
key[1] === "list",
(current: unknown) => {
if (!current) return current;
const page = current as NotificationListPage;
if (!page.items) return current;
const items = page.items;
const nextItems = items.map((n: Notification) =>
n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
        );
if (nextItems === items) return current;
return { ...page, items: nextItems };
      },
{ revalidate: false },
    );

try {
await markAllNotificationsRead();

const infiniteKeys = findNotificationInfiniteKeys(swrConfig.cache);

await Promise.all([
...buildNotificationListRevalidations(swrConfig, infiniteKeys),
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
      ]);

setState("success");
setError(null);

setTimeout(() => {
setState("idle");
      }, 1_000);
    } catch (cause: unknown) {

await globalMutate(
(key) =>
Array.isArray(key) &&
key[0] === "notifications" &&
key[1] === "list",
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
  }, [isFlagPlaceholder, state, swrConfig]);

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