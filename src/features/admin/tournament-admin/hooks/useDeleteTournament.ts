

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { addTournamentAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { deleteTournament } from '@/features/admin/services/tournament-admin.service';
import { ApiError, coerceToApiError } from '@/lib/api';
import {
adminTournamentsKeyMatcher,
nowMs,
publicTournamentDetailKeyMatcher,
publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type { TournamentCascadeDto } from '../admin-tournament-types';

export interface UseDeleteTournamentOptions {

confirmString?: string;
}

export interface UseDeleteTournamentAuditSnapshot {

beforeTournamentId: string | null;

beforeCascade: TournamentCascadeDto | null;

confirmedStringLength: number | null;
}

export interface UseDeleteTournamentResult {

remove: (id: string, options?: UseDeleteTournamentOptions) => Promise<void>;

readonly delete: (
id: string,
options?: UseDeleteTournamentOptions,
  ) => Promise<void>;

isPending: boolean;

error: ApiError | null;

reset: () => void;

audit: UseDeleteTournamentAuditSnapshot;
}

export function useDeleteTournament(): UseDeleteTournamentResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [beforeTournamentId, setBeforeTournamentId] = useState<string | null>(
null,
  );
const [beforeCascade, setBeforeCascade] = useState<TournamentCascadeDto | null>(
null,
  );
const [confirmedStringLength, setConfirmedStringLength] = useState<
number | null
  >(null);

const inFlightRef = useRef<Promise<void> | null>(null);

const remove = useCallback(
async (
id: string,
options: UseDeleteTournamentOptions = {},
    ): Promise<void> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setBeforeTournamentId(id);
setBeforeCascade(null);
setConfirmedStringLength(
typeof options.confirmString === 'string'
? options.confirmString.length
: null,
      );
setError(null);
setIsPending(true);

const startedAt = nowMs();
addTournamentAdminBreadcrumb({
action: 'tournament.delete',
route: 'admin-tournament.delete',
status: 'started',
durationMs: 0,
targetId: id,
      });

const core = (async (): Promise<void> => {
try {
await deleteTournament(id);

addTournamentAdminBreadcrumb({
action: 'tournament.delete',
route: 'admin-tournament.delete',
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
        } catch (caught: unknown) {
const apiError = coerceToApiError(caught);
setError(apiError);
addTournamentAdminBreadcrumb({
action: 'tournament.delete',
route: 'admin-tournament.delete',
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
              // Best-effort.
            });
          }

throw apiError;
        }
      })();

inFlightRef.current = core;
try {
await core;
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
setBeforeCascade(null);
setConfirmedStringLength(null);
setIsPending(false);
inFlightRef.current = null;
  }, []);

return {
remove,

delete: remove,
isPending,
error,
reset,
audit: {
beforeTournamentId,
beforeCascade,
confirmedStringLength,
    },
  };
}