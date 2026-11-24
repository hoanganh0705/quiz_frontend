"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getTournament } from "@/features/tournaments/services/tournaments.service";
import {
  TOURNAMENT_CACHE_KEYS,
  type TournamentDetail,
} from "@/features/tournaments/types/tournament.types";

import type { TournamentDetailResponseDto } from "@/lib/api/generated/schemas";

export interface UseTournamentResult {
  tournament: TournamentDetail | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;

  isStale: boolean;
}

type GetTournamentWireResponse = {
  data?: TournamentDetailResponseDto;
  meta?: unknown;
};

export function useTournament(
  tournamentId: string | null,
): UseTournamentResult {
  const key = useMemo(
    () =>
      tournamentId === null
        ? null
        : TOURNAMENT_CACHE_KEYS.detail(tournamentId),
    [tournamentId],
  );

  const fetcher = useCallback(async (): Promise<TournamentDetail | null> => {
    if (tournamentId === null) {
      return null;
    }

    const wire = (await getTournament(
      tournamentId,
    )) as unknown as GetTournamentWireResponse;

    if (!wire.data) {
      return null;
    }

    return {
      ...wire.data,
      id: wire.data.tournamentId,
    } as TournamentDetail;
  }, [tournamentId]);

  const result = useSingleWithRetry<TournamentDetail | null>({
    key,
    fetcher,
  });

  const refresh = useCallback(async () => {
    await result.retry();
  }, [result.retry]);

  return {
    tournament: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
    refresh,
    isStale: false,
  };
}
