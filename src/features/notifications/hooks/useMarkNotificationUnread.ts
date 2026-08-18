"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { markNotificationUnread } from "@/features/notifications/services/notifications.service";
import {
NOTIFICATION_CACHE_KEYS,
type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
buildNotificationListRevalidations,
findNotificationInfiniteKeys,
} from "@/features/notifications/utils/swr-infinite-cache";

export interface UseMarkNotificationUnreadResult {
markUnread: () => Promise<void>;
state: NotificationMutationState;
error: ApiError | null;
reset: () => void;
}

export function useMarkNotificationUnread(
notificationId: string | null,
): UseMarkNotificationUnreadResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [state, setState] = useState<NotificationMutationState>("idle");
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef(false);

const swrConfig = useSWRConfig();

const markUnread = useCallback(async (): Promise<void> => {
if (isFlagPlaceholder || notificationId === null) {
return;
    }

if (state === "pending" || inFlightRef.current) {
return;
    }

inFlightRef.current = true;
setState("pending");
setError(null);

try {

await markNotificationUnread(notificationId);

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
markUnread,
state,
error,
reset,
  };
}
