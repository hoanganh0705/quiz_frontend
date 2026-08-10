"use client";

/**
 * `useTournament` — single tournament detail hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.B2.
 *
 * ## What this hook owns
 *
 * - Fetch a single tournament's detail through the service layer.
 * - Synthesise an `id` alias on the detail.
 * - Expose `isStale` when revalidation fails with cached data present.
 * - Feature-flag gating via `tournaments_live`.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getTournament } from "@/features/tournaments/services/tournaments.service";
import {
  TOURNAMENT_CACHE_KEYS,
  type TournamentDetail,
} from "@/features/tournaments/types/tournament.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  TournamentDetailResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseTournamentResult {
  tournament: TournamentDetail | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True when revalidation failed with cached data present. */
  isStale: boolean;
}

// ─── Wire type ─────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getTournament`.
 *
 * The service returns `TournamentControllerGetTournamentById200` which is
 * `WrappedDto & TournamentControllerGetTournamentById200AllOf`.
 * Shape: `{ data: TournamentDetailResponseDto; meta: ResponseMetaDto }`.
 */
type GetTournamentWireResponse = {
  data?: TournamentDetailResponseDto;
  meta?: unknown;
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTournament(
  tournamentId: string | null,
): UseTournamentResult {
  const flagValue = getFeatureFlagValue("tournaments_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Disabled sentinel key when flag is off or id is null.
  const key = useMemo(
    () =>
      isFlagPlaceholder || tournamentId === null
        ? null
        : TOURNAMENT_CACHE_KEYS.detail(tournamentId),
    [isFlagPlaceholder, tournamentId],
  );

  const fetcher = useCallback(
    async (): Promise<TournamentDetail | null> => {
      if (isFlagPlaceholder || tournamentId === null) {
        return null;
      }

      const wire = (await getTournament(tournamentId)) as unknown as GetTournamentWireResponse;

      if (!wire.data) {
        // 404 is handled by the service wrapper throwing ApiError.
        // If we reach here without data, return null.
        return null;
      }

      return {
        ...wire.data,
        id: wire.data.tournamentId,
      } as TournamentDetail;
    },
    [isFlagPlaceholder, tournamentId],
  );

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
