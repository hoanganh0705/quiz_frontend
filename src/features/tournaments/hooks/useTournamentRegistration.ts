"use client";

/**
 * `useTournamentRegistration` — composed tournament registration interface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.B4.
 *
 * ## What this hook owns
 *
 * - Compose `useTournamentParticipation`, `useRegisterTournament`, and
 *   `useWithdrawTournament` into a single interface.
 * - Expose both read state (participation) and mutation functions (register,
 *   withdraw) with unified state.
 * - Reduce prop-drilling for components that need both participation state
 *   and mutation capabilities.
 *
 * ## State independence
 *
 * `registerState` and `withdrawState` are independent — a pending register
 * does not block the withdraw CTA (but the CTA's disabled state is determined
 * by its own mutation state).
 */

import { useMemo } from "react";

import { ApiError } from "@/lib/api";

import { useTournamentParticipation } from "@/features/tournaments/hooks/useTournamentParticipation";
import { useRegisterTournament } from "@/features/tournaments/hooks/useRegisterTournament";
import { useWithdrawTournament } from "@/features/tournaments/hooks/useWithdrawTournament";
import {
  type ParticipationState,
  type RegistrationMutationState,
} from "@/features/tournaments/types/registration.types";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseTournamentRegistrationResult {
  /** Current participation state, or null if not authenticated or feature flag is off. */
  participation: ParticipationState | null;
  /** True when the current user is registered for the tournament. */
  isRegistered: boolean;
  /** True when the current user is eligible to register. */
  isEligible: boolean;
  /** True when the user can withdraw (registered and server allows withdrawal). */
  canWithdraw: boolean;
  /** Loading state for participation data. */
  isLoading: boolean;

  /** Register for the tournament. */
  register: () => Promise<void>;
  /** Withdraw from the tournament. */
  withdraw: () => Promise<void>;

  /** Current state of the register mutation. */
  registerState: RegistrationMutationState;
  /** Current state of the withdraw mutation. */
  withdrawState: RegistrationMutationState;

  /** Error from the last failed register mutation. */
  registerError: ApiError | null;
  /** Error from the last failed withdraw mutation. */
  withdrawError: ApiError | null;

  /** Reset both mutation states and clear errors. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTournamentRegistration(
  tournamentId: string | null,
): UseTournamentRegistrationResult {
  const participation = useTournamentParticipation(tournamentId);
  const register = useRegisterTournament(tournamentId);
  const withdraw = useWithdrawTournament(tournamentId);

  const result = useMemo<UseTournamentRegistrationResult>(() => ({
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
  }), [
    participation.participation,
    participation.isRegistered,
    participation.isEligible,
    participation.canWithdraw,
    participation.isLoading,
    register.register,
    register.state,
    register.error,
    register.reset,
    withdraw.withdraw,
    withdraw.state,
    withdraw.error,
    withdraw.reset,
  ]);

  return result;
}
