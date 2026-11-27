"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
  type NotificationPreferences,
} from "@/features/notifications/types/notification.types";

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
  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef(false);

  const queryKey = useMemo(
    () =>
      NOTIFICATION_CACHE_KEYS.preferences(),
    [],
  );

  const {
    data,
    error: queryError,
    isLoading,
    refetch,
  } = useQuery<NotificationPreferences, unknown>(
    {
      queryKey,
      queryFn: async () => {
        const wire = (await getNotificationPreferences()) as unknown as
          GetNotificationPreferencesWireResponse | undefined;
        return wire ?? EMPTY_PREFERENCES;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 1_000,
    },
    getQueryClient(),
  );

  const update = useCallback(
    async (patch: UpdatePreferencesDto): Promise<void> => {
      if (state === "pending" || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      setState("pending");
      setError(null);

      const qc = getQueryClient();
      qc.setQueryData<NotificationPreferences>(queryKey, (current) => ({
        ...(current ?? EMPTY_PREFERENCES),
        ...patch,
      } as unknown as NotificationPreferences));

      try {
        await updateNotificationPreferences(patch);

        setState("success");
        setError(null);

        setTimeout(() => {
          setState("idle");
        }, 1_000);
      } catch (cause: unknown) {
        void refetch();

        setState("error");
        setError(coerceToApiError(cause));
      } finally {
        inFlightRef.current = false;
      }
    },
    [state, queryKey, refetch],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  const readError: ApiError | null = useMemo(
    () => (queryError ? coerceToApiError(queryError) : null),
    [queryError],
  );

  return {
    preferences: data ?? null,
    isLoading: isLoading && !queryError,
    error: readError,
    isUpdating: state === "pending",
    isUpdated: state === "success",
    updateError: error,
    update,
    reset,
  };
}
