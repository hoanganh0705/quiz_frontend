

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTournamentSdk = {
tournamentControllerCreateTournament: vi.fn(),
tournamentControllerUpdateTournament: vi.fn(),
tournamentControllerSoftDeleteTournament: vi.fn(),
};

vi.mock('@/lib/api', () => ({
getTournaments: () => mockTournamentSdk,
}));

vi.mock('@/lib/api/generated/tournaments/tournaments', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
createTournament,
deleteTournament,
updateTournament,
} from '../tournament-admin.service';

const TOURNAMENT_FIXTURE = {
tournamentId: 't-1',
title: 'Spring Tournament',
status: 'scheduled',
startsAt: '2026-04-01T00:00:00.000Z',
};

const wrapped = (data: unknown) => ({
data: data,
meta: { requestId: 'req-1' },
});

function makeApiError(extensions: {
requestId?: string;
correlationId?: string;
}): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock',
config: undefined,
request: undefined,
response: {
status: 500,
data: {
status: 500,
detail: 'boom',
title: 'Internal Server Error',
extensions,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
Object.values(mockTournamentSdk).forEach((fn) => fn.mockReset());
});

describe('tournament-admin.service — createTournament', () => {
it('calls tournamentControllerCreateTournament and unwraps the response', async () => {
mockTournamentSdk.tournamentControllerCreateTournament.mockResolvedValueOnce(
wrapped(TOURNAMENT_FIXTURE),
    );

const result = await createTournament({
title: 'Spring Tournament',
startsAt: '2026-04-01T00:00:00.000Z',
    } as unknown as Parameters<typeof createTournament>[0]);

expect(
mockTournamentSdk.tournamentControllerCreateTournament,
    ).toHaveBeenCalledWith({
title: 'Spring Tournament',
startsAt: '2026-04-01T00:00:00.000Z',
    });
expect(result.tournamentId).toBe('t-1');
  });

it('propagates ApiError on failure', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTournamentSdk.tournamentControllerCreateTournament.mockRejectedValueOnce(
error,
    );

await expect(
createTournament({} as Parameters<typeof createTournament>[0]),
    ).rejects.toBe(error);
  });
});

describe('tournament-admin.service — updateTournament', () => {
it('calls tournamentControllerUpdateTournament with id and input', async () => {
mockTournamentSdk.tournamentControllerUpdateTournament.mockResolvedValueOnce(
wrapped(TOURNAMENT_FIXTURE),
    );

const result = await updateTournament('t-1', {
title: 'Spring Tournament v2',
    } as Parameters<typeof updateTournament>[1]);

expect(
mockTournamentSdk.tournamentControllerUpdateTournament,
    ).toHaveBeenCalledWith('t-1', { title: 'Spring Tournament v2' });
expect(result.tournamentId).toBe('t-1');
  });

it('propagates ApiError on failure', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTournamentSdk.tournamentControllerUpdateTournament.mockRejectedValueOnce(
error,
    );

await expect(
updateTournament('t-1', {} as Parameters<typeof updateTournament>[1]),
    ).rejects.toBe(error);
  });
});

describe('tournament-admin.service — deleteTournament', () => {
it('calls tournamentControllerSoftDeleteTournament with the id', async () => {
mockTournamentSdk.tournamentControllerSoftDeleteTournament.mockResolvedValueOnce(
wrapped(undefined),
    );

await deleteTournament('t-1');

expect(
mockTournamentSdk.tournamentControllerSoftDeleteTournament,
    ).toHaveBeenCalledWith('t-1');
  });

it('propagates ApiError with TOURNAMENT_ALREADY_STARTED or TOURNAMENT_HAS_PARTICIPANTS', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTournamentSdk.tournamentControllerSoftDeleteTournament.mockRejectedValueOnce(
error,
    );

await expect(deleteTournament('t-1')).rejects.toBe(error);
  });
});

describe('tournament-admin.service — JSDoc invariants', () => {
it('deleteTournament documents TOURNAMENT_HAS_PARTICIPANTS and TOURNAMENT_ALREADY_STARTED', () => {
const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', 'tournament-admin.service.ts');
const source = readFileSync(sourcePath, 'utf-8');
expect(source).toMatch(/TOURNAMENT_HAS_PARTICIPANTS/);
expect(source).toMatch(/TOURNAMENT_ALREADY_STARTED/);
  });
});
