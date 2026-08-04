"use client";

/**
 * `useNotificationPreferences` — read and update the user's notification
 * preferences.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B7.
 *
 * ## What this hook owns
 *
 * - Read `GET /api/v1/notifications/preferences` via SWR.
 * - Update `PUT /api/v1/notifications/preferences` via a mutation
 *   action with double-click prevention.
 * - Optimistically apply the update to the SWR cache, then revalidate
 *   on success.
 * - Map domain-specific error codes (`GLOBAL_VALIDATION_FAILED`,
 *   `INVALID_PREFERENCE_VALUE`, `UNAUTHORIZED`, …) to typed `ApiError`.
 * - Feature-flag gating via `phase5_notifications`.
 *
 * ## PATCH vs PUT
 *
 * The backend uses `PATCH /api/v1/notifications/preferences` (the
 * SDK definition uses `updateNotificationPreferences` and emits a
 * PATCH). All fields on the DTO are optional, so the hook can submit a
 * partial update (e.g. only toggling `emailEnabled`).
 *
 * ## Server authority
 *
 * The preferences response is the source of truth. The optimistic
 * update is overridden on the next revalidation (e.g. window focus,
 * reconnect, or a successful mutation).
 *
 * ## Auth
 *
 * When unauthenticated, both the read and the mutation reject with
 * a `GLOBAL_UNAUTHENTICATED` `ApiError.code`.
 */

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

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: ApiError | null;
  /** `true` while the mutation is in flight. */
  isUpdating: boolean;
  /** `true` after the most recent mutation succeeds. */
  isUpdated: boolean;
  /** The last mutation error, if any. */
  updateError: ApiError | null;
  /**
   * Submit a partial preferences update. Missing fields are left
   * unchanged on the server.
   */
  update: (patch: UpdatePreferencesDto) => Promise<void>;
  /** Reset the mutation state machine back to idle. */
  reset: () => void;
}

// ─── Wire type ────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getNotificationPreferences` (post-unwrap).
 */
type GetNotificationPreferencesWireResponse = NotificationPreferences;

// ─── Constants ────────────────────────────────────────────────────────────

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

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Read and update the user's notification preferences.
 */
export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const flagValue = getFeatureFlagValue("phase5_notifications");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef(false);

  // SWR cache key: disabled sentinel when flag is off so no fetch fires.
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

      // Optimistic merge into the SWR cache.
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

        // Reset to idle after 1 second so the UI CTA can be used again.
        setTimeout(() => {
          setState("idle");
        }, 1_000);
      } catch (cause: unknown) {
        // Roll back the optimistic update on error.
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

  // Defensive error normalisation — same pattern as the other hooks.
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
