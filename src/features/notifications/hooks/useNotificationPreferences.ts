"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { ApiError, isApiError } from "@/lib/api";

import {
getNotificationPreferences,
updateNotificationPreferences,
} from "@/features/notifications/services/notifications.service";
import {
NOTIFICATION_CACHE_KEYS,
type NotificationMutationState,
type NotificationPreferences,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { UpdatePreferencesDto } from "@/lib/api/generated/schemas";

export interface UseNotificationPreferencesResult {
preferences: NotificationPreferences | null;
isLoading: boolean;
error: ApiError | null;

isUpdating: boolean;

isUpdated: boolean;

updateError: ApiError | null;

update: (patch: UpdatePreferencesDto) => Promise<void>;

reset: () => void;
}

type GetNotificationPreferencesWireResponse = NotificationPreferences;

const EMPTY_PREFERENCES: NotificationPreferences = {
inAppEnabled: false,
emailEnabled: false,
pushEnabled: false,
achievementEnabled: false,
tournamentEnabled: false,
rankEnabled: false,
friendEnabled: false,
commentEnabled: false,
summaryEnabled: false,
marketingEnabled: false,
rankImprovementThreshold: 1,
};

export function useNotificationPreferences(): UseNotificationPreferencesResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [state, setState] = useState<NotificationMutationState>("idle");
const [error, setError] = useState<ApiError | null>(null);
const inFlightRef = useRef(false);

const swrKey = useMemo(
() =>
isFlagPlaceholder
? (["notifications", "preferences", "disabled"] as const)
: NOTIFICATION_CACHE_KEYS.preferences(),
[isFlagPlaceholder],
  );

const swr = useSWR<NotificationPreferences, unknown>(
swrKey,
async () => {
if (isFlagPlaceholder) {
return EMPTY_PREFERENCES;
      }
const wire = (await getNotificationPreferences()) as unknown as
| GetNotificationPreferencesWireResponse
        | undefined;
return (
wire ?? EMPTY_PREFERENCES
      );
    },
{
revalidateOnFocus: true,
revalidateOnReconnect: true,
dedupingInterval: 1_000,
    },
  );

const update = useCallback(
async (patch: UpdatePreferencesDto): Promise<void> => {
if (isFlagPlaceholder) {
return;
      }

if (state === "pending" || inFlightRef.current) {
return;
      }

inFlightRef.current = true;
setState("pending");
setError(null);

await swr.mutate(
((current: NotificationPreferences | undefined) => ({
...(current ?? EMPTY_PREFERENCES),
...patch,
        })) as Parameters<typeof swr.mutate>[0],
{ revalidate: false },
      );

try {
await updateNotificationPreferences(patch);

setState("success");
setError(null);

setTimeout(() => {
setState("idle");
        }, 1_000);
      } catch (cause: unknown) {

await swr.mutate(undefined, { revalidate: true });

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
    },
[isFlagPlaceholder, state, swr],
  );

const reset = useCallback(() => {
setState("idle");
setError(null);
inFlightRef.current = false;
  }, []);

const readError: ApiError | null = useMemo(() => {
if (!swr.error) return null;
if (isApiError(swr.error)) return swr.error;
return new ApiError(
swr.error as unknown as ConstructorParameters<typeof ApiError>[0],
    );
  }, [swr.error]);

return {
preferences: swr.data ?? null,
isLoading: swr.isLoading,
error: readError,
isUpdating: state === "pending",
isUpdated: state === "success",
updateError: error,
update,
reset,
  };
}
