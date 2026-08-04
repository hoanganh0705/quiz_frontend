"use client";

/**
 * `useRegisterTournament` — tournament registration mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.B2.
 *
 * ## What this hook owns
 *
 * - Register the authenticated user for a tournament via the service layer.
 * - Map registration-specific error codes (`ALREADY_REGISTERED`, `TOURNAMENT_FULL`,
 *   `TOURNAMENT_REGISTRATION_CLOSED`, etc.) to typed `ApiError`.
 * - Invalidate the tournament detail, participants, and leaderboard SWR keys
 *   on success.
 * - Feature-flag gating via `phase5_tournaments`.
 *
 * ## Double-click prevention
 *
 * The `state` discriminator prevents concurrent mutation calls. While `state`
 * is `'pending'`, `register()` is a no-op.
 *
 * ## No blind retry
 *
 * Registration failures are surfaced as typed errors; the user must act
 * intentionally to retry. The CTA re-enables after failure.
 *
 * ## Auth
 *
 * When unauthenticated, `register()` returns a rejected promise with
 * `UNAUTHORIZED` code so the CTA can trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { registerForTournament } from "@/features/tournaments/services/tournaments.service";
import {
  TOURNAMENT_REGISTRATION_CACHE_KEYS,
  type RegistrationMutationState,
} from "@/features/tournaments/types/registration.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  RegisterTournamentResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRegisterTournamentResult {
  register: () => Promise<void>;
  state: RegistrationMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useRegisterTournament(
  tournamentId: string | null,
): UseRegisterTournamentResult {
  const flagValue = getFeatureFlagValue("phase5_tournaments");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<RegistrationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  // Ref to track if a mutation is in flight (prevents concurrent calls)
  const inFlightRef = useRef(false);

  const register = useCallback(async (): Promise<void> => {
    // Feature flag off: no-op
    if (isFlagPlaceholder || tournamentId === null) {
      return;
    }

    // Double-click guard: if already pending, do not start another mutation
    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      // Call the registration service
      const result = (await registerForTournament(tournamentId)) as {
        data?: RegisterTournamentResponseDto;
      };

      // Invalidate all tournament-related SWR keys
      const keys = TOURNAMENT_REGISTRATION_CACHE_KEYS.all(tournamentId);
      await Promise.all([
        globalMutate(keys.detail, undefined, { revalidate: true }),
        globalMutate(keys.participants, undefined, { revalidate: true }),
        globalMutate(keys.leaderboard, undefined, { revalidate: true }),
      ]);

      setState("success");
      setError(null);

      // Reset to idle after 2 seconds so the CTA can be used again if needed
      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (cause: unknown) {
      // Classify the error for user-facing copy
      if (isApiError(cause)) {
        // Already an ApiError, use as-is
        setState("error");
        setError(cause);
      } else if (cause instanceof Error) {
        // Network error or unknown error
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      } else {
        // Unknown non-Error cause
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, tournamentId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    register,
    state,
    error,
    reset,
  };
}
