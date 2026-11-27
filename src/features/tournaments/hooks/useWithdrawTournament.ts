"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { withdrawFromTournament } from "@/features/tournaments/services/tournaments.service";
import { TOURNAMENT_REGISTRATION_CACHE_KEYS } from "@/features/tournaments/types/registration.types";

import type { RegistrationMutationState } from "@/features/tournaments/types/registration.types";

export interface UseWithdrawTournamentResult {
  withdraw: () => Promise<void>;
  state: RegistrationMutationState;
  error: ApiError | null;
  reset: () => void;
}

export function useWithdrawTournament(
  tournamentId: string | null,
): UseWithdrawTournamentResult {
  const [state, setState] = useState<RegistrationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const withdraw = useCallback(async (): Promise<void> => {
    if (tournamentId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await withdrawFromTournament(tournamentId);

      const keys = TOURNAMENT_REGISTRATION_CACHE_KEYS.all(tournamentId);
      try {
        const qc = getQueryClient();
        void qc.invalidateQueries({ queryKey: keys.detail });
        void qc.invalidateQueries({ queryKey: keys.participants });
        void qc.invalidateQueries({ queryKey: keys.leaderboard });
        void qc.invalidateQueries({ queryKey: ["tournaments"] });
      } catch {}

      setState("success");
      setError(null);

      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (cause: unknown) {
      setState("error");
      setError(coerceToApiError(cause));
    } finally {
      inFlightRef.current = false;
    }
  }, [tournamentId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    withdraw,
    state,
    error,
    reset,
  };
}
