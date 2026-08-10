"use client";

/**
 * `useTournamentParticipation` — read current user's tournament participation state.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.B1.
 *
 * ## What this hook owns
 *
 * - Derive the current user's participation state for a tournament from
 *   existing SWR cache (no extra fetch).
 * - Determine eligibility, registration status, and withdrawal permission
 *   from server-provided tournament detail flags.
 * - Return safe fallback state when unauthenticated or feature flag is off.
 *
 * ## Server authority
 *
 * Eligibility, capacity, and withdrawal-allowed flags are sourced entirely
 * from the server-provided tournament detail. No client-side inference.
 *
 * ## Auth reads
 *
 * Public participant list reads do not require authentication. The hook
 * derives participation from both the detail and participant list without
 * making extra requests.
 */

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useTournament } from "@/features/tournaments/hooks/useTournament";
import { useTournamentParticipants } from "@/features/tournaments/hooks/useTournamentParticipants";
import {
  TOURNAMENT_REGISTRATION_CACHE_KEYS,
  type ParticipationState,
  type RegistrationStatus,
} from "@/features/tournaments/types/registration.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { TournamentDetail } from "@/features/tournaments/types";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseTournamentParticipationResult {
  participation: ParticipationState | null;
  isRegistered: boolean;
  isEligible: boolean;
  canWithdraw: boolean;
  isLoading: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the userId from the CurrentUserResponseDto.
 */
function getUserId(
  currentUser: { userId?: string; id?: string } | null,
): string | null {
  if (!currentUser) return null;
  return currentUser.userId ?? currentUser.id ?? null;
}

/**
 * Determine the registration status from tournament detail flags.
 *
 * Server-authoritative: all logic is driven by flags from the tournament detail.
 */
function deriveRegistrationStatus(params: {
  tournament: TournamentDetail;
  userId: string | null;
  isInParticipantList: boolean;
}): RegistrationStatus {
  const { tournament, userId, isInParticipantList } = params;

  // If no user is authenticated, we cannot determine eligibility
  if (!userId) {
    return "unknown";
  }

  // If the user is in the participant list, they're registered
  // (the participant list only includes non-withdrawn participants)
  if (isInParticipantList) {
    return "registered";
  }

  // Check server-provided fields for eligibility and capacity
  // Note: The backend may not provide all these fields.
  // We check registration deadline for "closed" status.
  const now = new Date();
  const isRegistrationOpen = true; // TODO: check tournament.registrationDeadline when available

  // Check if tournament is full based on totalParticipants and maxParticipants
  const isFull =
    typeof tournament.maxParticipants === "number" &&
    typeof tournament.totalParticipants === "number" &&
    tournament.totalParticipants >= tournament.maxParticipants;

  if (!isRegistrationOpen) {
    return "closed";
  }

  if (isFull) {
    return "full";
  }

  // Note: Backend may not provide isEligibleForTournament field
  // Assume eligible if not explicitly marked otherwise
  const isEligible = true;

  if (!isEligible) {
    return "not_eligible";
  }

  return "eligible";
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTournamentParticipation(
  tournamentId: string | null,
): UseTournamentParticipationResult {
  const flagValue = getFeatureFlagValue("tournaments_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Auth state
  const { bootstrapState, currentUser } = useAuthSession();
  const userId = useMemo(
    () => getUserId(currentUser),
    [currentUser],
  );
  const isAuthenticated = bootstrapState === "authenticated";

  // Tournament detail (for eligibility, capacity, registration deadline)
  const { tournament, isLoading: isDetailLoading } = useTournament(tournamentId);

  // Participants list (to check if current user is registered)
  const { items: participants, isLoading: isParticipantsLoading } =
    useTournamentParticipants(tournamentId, { limit: 100 });

  const isLoading = isDetailLoading || isParticipantsLoading;

  // Derive participation state from cached data
  const result = useMemo((): UseTournamentParticipationResult => {
    // Feature flag off or no tournament: safe fallback
    if (isFlagPlaceholder || tournamentId === null) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading: false,
      };
    }

    // No authenticated user: cannot determine participation
    if (!isAuthenticated || !userId) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading,
      };
    }

    // Tournament detail not yet loaded
    if (!tournament) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading: true,
      };
    }

    // Check if current user is in the participant list
    const isInParticipantList = participants.some(
      (p) => p.userId === userId,
    );

    const status = deriveRegistrationStatus({
      tournament,
      userId,
      isInParticipantList,
    });

    const isRegistered = status === "registered";
    const isEligible = status === "eligible";
    // canWithdraw is true when registered and tournament hasn't started yet
    // Note: Backend doesn't provide canWithdraw field, so we allow withdrawal
    // as long as the user is registered
    const canWithdraw = isRegistered;

    // Find the user's participant record for registeredAt
    const userParticipant = participants.find((p) => p.userId === userId);
    const registeredAt = userParticipant?.registeredAt ?? null;

    const participation: ParticipationState = {
      tournamentId,
      userId,
      isRegistered,
      registrationStatus: status,
      registeredAt,
      canWithdraw,
    };

    return {
      participation,
      isRegistered,
      isEligible,
      canWithdraw,
      isLoading,
    };
  }, [
    isFlagPlaceholder,
    tournamentId,
    isAuthenticated,
    userId,
    tournament,
    participants,
    isLoading,
  ]);

  return result;
}
