"use client";

import { useMemo } from "react";

import { ApiError } from "@/lib/api";

import { useTournamentParticipation } from "@/features/tournaments/hooks/useTournamentParticipation";
import { useRegisterTournament } from "@/features/tournaments/hooks/useRegisterTournament";
import { useWithdrawTournament } from "@/features/tournaments/hooks/useWithdrawTournament";
import {
  type ParticipationState,
  type RegistrationMutationState,
} from "@/features/tournaments/types/registration.types";

export interface UseTournamentRegistrationResult {

  participation: ParticipationState | null;

  isRegistered: boolean;

  isEligible: boolean;

  canWithdraw: boolean;

  isLoading: boolean;

  register: () => Promise<void>;

  withdraw: () => Promise<void>;

  registerState: RegistrationMutationState;

  withdrawState: RegistrationMutationState;

  registerError: ApiError | null;

  withdrawError: ApiError | null;

  reset: () => void;
}

export function useTournamentRegistration(
  tournamentId: string | null,
): UseTournamentRegistrationResult {
  const participation = useTournamentParticipation(tournamentId);
  const register = useRegisterTournament(tournamentId);
  const withdraw = useWithdrawTournament(tournamentId);

  // Stable object: only recomputes when the actual data primitives change.
  // Primitives from the three child hooks are referentially stable across renders
  // as long as the underlying data hasn't changed, so this is safe without a
  // long dependency array.
  return useMemo<UseTournamentRegistrationResult>(
    () => ({
      participation: participation.participation,
      isRegistered: participation.isRegistered,
      isEligible: participation.isEligible,
      canWithdraw: participation.canWithdraw,
      isLoading: participation.isLoading,

      register: register.register,
      withdraw: withdraw.withdraw,

      registerState: register.state,
      withdrawState: withdraw.state,

      registerError: register.error,
      withdrawError: withdraw.error,

      reset: () => {
        register.reset();
        withdraw.reset();
      },
    }),
    [
      participation.participation,
      participation.isRegistered,
      participation.isEligible,
      participation.canWithdraw,
      participation.isLoading,
      register,
      withdraw,
    ],
  );
}
