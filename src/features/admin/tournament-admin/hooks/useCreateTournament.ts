

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, coerceToApiError } from '@/lib/api';
import { addTournamentAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { createTournament } from '@/features/admin/services/tournament-admin.service';
import { tournamentAdminListKeyMatcher } from './useTournamentAdminList';
import {
adminTournamentsKeyMatcher,
nowMs,
publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type {
TournamentCreateDto,
TournamentDto,
} from '../admin-tournament-types';

export interface UseCreateTournamentAuditSnapshot {

beforeInput: TournamentCreateDto | null;

afterTournament: TournamentDto | null;
}

export interface UseCreateTournamentResult {

create: (input: TournamentCreateDto) => Promise<TournamentDto>;

isPending: boolean;

error: ApiError | null;

reset: () => void;

audit: UseCreateTournamentAuditSnapshot;
}

export function useCreateTournament(): UseCreateTournamentResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [beforeInput, setBeforeInput] = useState<TournamentCreateDto | null>(
null,
  );
const [afterTournament, setAfterTournament] = useState<TournamentDto | null>(
null,
  );

const inFlightRef = useRef<Promise<TournamentDto> | null>(null);

const create = useCallback(
async (input: TournamentCreateDto): Promise<TournamentDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setBeforeInput(input);
setAfterTournament(null);
setError(null);
setIsPending(true);

const startedAt = nowMs();
addTournamentAdminBreadcrumb({
action: 'tournament.create',
route: 'admin-tournament.create',
status: 'started',
durationMs: 0,
      });

const core = (async (): Promise<TournamentDto> => {
try {
const created = await createTournament(input);

setAfterTournament(created);
addTournamentAdminBreadcrumb({
action: 'tournament.create',
route: 'admin-tournament.create',
status: 'success',
durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
targetId: created.tournamentId,
          });

await globalMutate(
(key: readonly unknown[]) =>
tournamentAdminListKeyMatcher(key) ||
publicTournamentsKeyMatcher(key),
undefined,
{ revalidate: true },
          );

return created;
        } catch (caught: unknown) {
const apiError = coerceToApiError(caught);
setError(apiError);
addTournamentAdminBreadcrumb({
action: 'tournament.create',
route: 'admin-tournament.create',
status: 'failure',
durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
redactedPayload: {
requestId: apiError.requestId,
detail: apiError.detail,
            },
          });
throw apiError;
        }
      })();

inFlightRef.current = core;
try {
return await core;
      } finally {
setIsPending(false);
inFlightRef.current = null;
      }
    },
[],
  );

const reset = useCallback(() => {
setError(null);
setBeforeInput(null);
setAfterTournament(null);
setIsPending(false);
inFlightRef.current = null;
  }, []);

return {
create,
isPending,
error,
reset,
audit: {
beforeInput,
afterTournament,
    },
  };
}