

'use client';

import { useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getTournamentStats } from '@/features/tournaments/services/tournaments.service';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { PERMISSIONS } from '@/features/admin/permissions';

import type { TournamentCascadeDto } from '../admin-tournament-types';

export interface UseTournamentCascadeResult {
cascade: TournamentCascadeDto | null;
isLoading: boolean;
error: import('@/lib/api/core/ApiError').ApiError | null;
}

function buildCascadeFromStats(
wire: unknown,
): TournamentCascadeDto {
if (wire === null || typeof wire !== 'object') {
return { participants: null, rounds: null, leaderboards: null };
  }
const candidate = wire as { participantCount?: unknown };
const participants =
typeof candidate.participantCount === 'number'
? candidate.participantCount
: null;
return {
participants,
rounds: null,
leaderboards: null,
  };
}

export function useTournamentCascade(
tournamentId: string | null,
): UseTournamentCascadeResult {

const permission = usePermission(PERMISSIONS.tournament_delete);

const key = useMemo(
() =>
permission.hasPermission && tournamentId !== null
? (['admin', 'tournaments', 'cascade', tournamentId] as const)
: null,
[permission.hasPermission, tournamentId],
  );

const result = useSingleWithRetry<TournamentCascadeDto | null>({
key,
fetcher: async ({ signal }) => {

const wire = (await getTournamentStats(
tournamentId as string,
      )) as unknown;
if (signal.aborted) throw new Error('aborted');
return buildCascadeFromStats(wire);
    },
  });

if (!permission.hasPermission || tournamentId === null) {
return { cascade: null, isLoading: false, error: null };
  }

return {
cascade: result.data ?? null,
isLoading: result.isLoading,
error: result.error,
  };
}