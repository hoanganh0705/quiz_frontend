"use client";

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useTournament } from "@/features/tournaments/hooks/useTournament";
import { useTournamentParticipants } from "@/features/tournaments/hooks/useTournamentParticipants";
import {
  type ParticipationState,
  type RegistrationStatus,
} from "@/features/tournaments/types/registration.types";

import { isTournamentRegistrationOpen } from "@/features/tournaments/lib/tournament-lifecycle";
import type { TournamentDetail } from "@/features/tournaments/types";

export interface UseTournamentParticipationResult {
  participation: ParticipationState | null;
  isRegistered: boolean;
  isEligible: boolean;
  canWithdraw: boolean;
  isLoading: boolean;
}

function getUserId(
  currentUser: { userId?: string; id?: string } | null,
): string | null {
  if (!currentUser) return null;
  return currentUser.userId ?? currentUser.id ?? null;
}

function deriveRegistrationStatus(params: {
  tournament: TournamentDetail;
  userId: string | null;
  isInParticipantList: boolean;
}): RegistrationStatus {
  const { tournament, userId, isInParticipantList } = params;

  if (!userId) {
    return "unknown";
  }

  if (isInParticipantList) {
    return "registered";
  }

  const isRegistrationOpen = isTournamentRegistrationOpen(tournament);

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

  const isEligible = true;

  if (!isEligible) {
    return "not_eligible";
  }

  return "eligible";
}

export function useTournamentParticipation(
  tournamentId: string | null,
): UseTournamentParticipationResult {
  const { bootstrapState, currentUser } = useAuthSession();
  const userId = useMemo(() => getUserId(currentUser), [currentUser]);
  const isAuthenticated = bootstrapState === "authenticated";

  const { tournament, isLoading: isDetailLoading } =
    useTournament(tournamentId);

  const { items: participants, isLoading: isParticipantsLoading } =
    useTournamentParticipants(tournamentId, { limit: 100 });

  const isLoading =
    isDetailLoading ||
    isParticipantsLoading ||
    (bootstrapState as string) === "loading" ||
    bootstrapState === "bootstrapping";

  const result = useMemo((): UseTournamentParticipationResult => {
    if (tournamentId === null) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading: false,
      };
    }

    if (!isAuthenticated || !userId) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading,
      };
    }

    if (!tournament) {
      return {
        participation: null,
        isRegistered: false,
        isEligible: false,
        canWithdraw: false,
        isLoading: true,
      };
    }

    const isInParticipantList = participants.some((p) => p.userId === userId);

    const status = deriveRegistrationStatus({
      tournament,
      userId,
      isInParticipantList,
    });

    const isRegistered = status === "registered";
    const isEligible = status === "eligible";

    const canWithdraw =
      isRegistered && isTournamentRegistrationOpen(tournament);

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
  }, [tournamentId,
    isAuthenticated,
    userId,
    tournament,
    participants,
    isLoading,
  ]);

  return result;
}
