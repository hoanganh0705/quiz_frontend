

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, coerceToApiError } from '@/lib/api';
import { addTournamentAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { updateTournament } from '@/features/admin/services/tournament-admin.service';
import {
adminTournamentsKeyMatcher,
nowMs,
publicTournamentDetailKeyMatcher,
publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type {
TournamentDto,
TournamentUpdateDto,
} from '../admin-tournament-types';

export interface UseUpdateTournamentAuditSnapshot {

beforeTournamentId: string | null;

beforeInput: TournamentUpdateDto | null;

beforeTournament: TournamentDto | null;

afterTournamentId: string | null;

afterTournament: TournamentDto | null;
}

export interface UseUpdateTournamentResult {

update: (
id: string,
input: TournamentUpdateDto,
  ) => Promise<TournamentDto>;

isPending: boolean;

error: ApiError | null;

reset: () => void;

audit: UseUpdateTournamentAuditSnapshot;
}

export function useUpdateTournament(): UseUpdateTournamentResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [beforeTournamentId, setBeforeTournamentId] = useState<string | null>(
null,
  );
const [beforeInput, setBeforeInput] = useState<TournamentUpdateDto | null>(
null,
  );
const [beforeTournament, setBeforeTournament] = useState<TournamentDto | null>(
null,
  );
const [afterTournamentId, setAfterTournamentId] = useState<string | null>(
null,
  );
const [afterTournament, setAfterTournament] = useState<TournamentDto | null>(
null,
  );

const inFlightRef = useRef<Promise<TournamentDto> | null>(null);

const update = useCallback(
async (id: string, input: TournamentUpdateDto): Promise<TournamentDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setBeforeTournamentId(id);
setBeforeInput(input);
setBeforeTournament(null);
setAfterTournamentId(null);
setAfterTournament(null);
setError(null);
setIsPending(true);

const startedAt = nowMs();
addTournamentAdminBreadcrumb({
action: 'tournament.update',
route: 'admin-tournament.update',
status: 'started',
durationMs: 0,
targetId: id,
      });

const core = (async (): Promise<TournamentDto> => {
try {
const updated = await updateTournament(id, input);

setAfterTournamentId(id);
setAfterTournament(updated);
addTournamentAdminBreadcrumb({
action: 'tournament.update',
route: 'admin-tournament.update',
status: 'success',
durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
targetId: id,
          });

await globalMutate(
(key: readonly unknown[]) =>
adminTournamentsKeyMatcher(key) ||
publicTournamentsKeyMatcher(key) ||
publicTournamentDetailKeyMatcher(key, id),
undefined,
{ revalidate: true },
          );

return updated;
        } catch (caught: unknown) {
const apiError = coerceToApiError(caught);
setError(apiError);
addTournamentAdminBreadcrumb({
action: 'tournament.update',
route: 'admin-tournament.update',
status: 'failure',
durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
targetId: id,
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
redactedPayload: {
requestId: apiError.requestId,
detail: apiError.detail,
            },
          });

if (apiError.code === 'TOURNAMENT_NOT_FOUND') {
await globalMutate(
(key: readonly unknown[]) =>
adminTournamentsKeyMatcher(key) ||
publicTournamentDetailKeyMatcher(key, id),
undefined,
{ revalidate: true },
            ).catch(() => {
              // Best-effort — failure here is surfaced via the
              // original `apiError` and is not bubbled.
            });
          }

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
setBeforeTournamentId(null);
setBeforeInput(null);
setBeforeTournament(null);
setAfterTournamentId(null);
setAfterTournament(null);
setIsPending(false);
inFlightRef.current = null;
  }, []);

return {
update,
isPending,
error,
reset,
audit: {
beforeTournamentId,
beforeInput,
beforeTournament,
afterTournamentId,
afterTournament,
    },
  };
}