

'use client';

import { useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getTournament } from '@/features/tournaments/services/tournaments.service';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { PERMISSIONS } from '@/features/admin/permissions';

import type { TournamentDto } from '../admin-tournament-types';

export interface UseTournamentResult {
tournament: TournamentDto | null;
isLoading: boolean;
error: import('@/lib/api/core/ApiError').ApiError | null;
}

export function useTournament(id: string | null): UseTournamentResult {

const permission = usePermission(PERMISSIONS.tournament_update);

const key = useMemo(
() =>
permission.hasPermission && id !== null
? (['admin', 'tournaments', 'detail', id] as const)
: null,
[permission.hasPermission, id],
  );

const result = useSingleWithRetry<TournamentDto | null>({
key,
fetcher: async ({ signal }) => {

const wire = (await getTournament(id as string)) as unknown as
| { data?: TournamentDto }
        | TournamentDto;
if (signal.aborted) throw new Error('aborted');
const tournament =
wire !== null && typeof wire === 'object' && 'data' in wire
? ((wire as { data?: TournamentDto }).data ?? null)
: (wire as TournamentDto);
return tournament;
    },
  });

if (!permission.hasPermission || id === null) {
return { tournament: null, isLoading: false, error: null };
  }

return {
tournament: result.data ?? null,
isLoading: result.isLoading,
error: result.error,
  };
}