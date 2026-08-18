

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

const mockGetTournamentStats = vi.hoisted(() => vi.fn());

vi.mock('@/features/tournaments/services/tournaments.service', () => ({
getTournamentStats: (...args: unknown[]) =>
mockGetTournamentStats(...args),
}));

const mockUsePermission = vi.hoisted(
() =>
vi.fn((_name: string) => ({
isLoading: false,
error: null,
hasPermission: true,
    })),
);

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: (name: string) =>
(mockUsePermission as unknown as (n: string) => ReturnType<typeof mockUsePermission>)(name),
}));

vi.mock('@/lib/api', async () => {
const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return actual;
});

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeStats(participantCount: number): {
participantCount: number;
} {
return { participantCount };
}

function makeApiError(
code: string,
status: number,
requestId: string,
): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status,
data: {
status,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
config: undefined,
request: undefined,
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

afterEach(() => {
vi.clearAllMocks();
mockGetTournamentStats.mockReset();
mockUsePermission.mockReset();
});

beforeEach(() => {
mockGetTournamentStats.mockReset();
mockUsePermission.mockReset();
mockUsePermission.mockReturnValue({
isLoading: false,
error: null,
hasPermission: true,
  });
});

import { useTournamentCascade } from '../useTournamentCascade';

function renderUseTournamentCascade(tournamentId: string | null) {
return renderHook(() => useTournamentCascade(tournamentId), {
wrapper: ({ children }) => children,
  });
}

describe('TKT-7.7.C6 — useTournamentCascade: disabled paths', () => {
it('AC #1: null id → isLoading false, cascade null, no fetch', () => {
const { result } = renderUseTournamentCascade(null);

expect(result.current.isLoading).toBe(false);
expect(result.current.cascade).toBeNull();
expect(result.current.error).toBeNull();
expect(mockGetTournamentStats).not.toHaveBeenCalled();
  });

it('AC #2: permission denied → isLoading false, cascade null, no fetch', () => {
mockUsePermission.mockReturnValueOnce({
isLoading: false,
error: null,
hasPermission: false,
    });

const { result } = renderUseTournamentCascade(TOURNAMENT_ID);

expect(result.current.isLoading).toBe(false);
expect(result.current.cascade).toBeNull();
expect(result.current.error).toBeNull();
expect(mockGetTournamentStats).not.toHaveBeenCalled();
  });
});

describe('TKT-7.7.C6 — useTournamentCascade: success path', () => {
it('AC #3 + AC #6: success derives a documented cascade in one fetch', async () => {
mockGetTournamentStats.mockResolvedValueOnce(makeStats(42));

const { result } = renderUseTournamentCascade(TOURNAMENT_ID);

expect(result.current.isLoading).toBe(true);

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.cascade).toEqual({
participants: 42,
rounds: null,
leaderboards: null,
    });
expect(result.current.error).toBeNull();
expect(mockGetTournamentStats).toHaveBeenCalledTimes(1);
  });

it('AC #5: rerendering with a different id triggers a new fetch', async () => {
mockGetTournamentStats.mockResolvedValue(makeStats(10));

const { result, rerender } = renderHook(
({ id }: { id: string | null }) => useTournamentCascade(id),
{
initialProps: { id: TOURNAMENT_ID },
wrapper: ({ children }) => children,
      },
    );

await waitFor(() => {
expect(result.current.cascade).not.toBeNull();
    });

expect(mockGetTournamentStats).toHaveBeenCalledTimes(1);

void rerender({ id: '00000000-0000-4000-8000-000000000002' });

await waitFor(() => {
expect(mockGetTournamentStats).toHaveBeenCalledTimes(2);
    });
  });

it('AC #5: rerendering with the same id does not trigger a new fetch (until cache flush)', async () => {
mockGetTournamentStats.mockResolvedValue(makeStats(10));

const { result, rerender } = renderHook(
({ id }: { id: string | null }) => useTournamentCascade(id),
{
initialProps: { id: TOURNAMENT_ID },
wrapper: ({ children }) => children,
      },
    );

await waitFor(() => {
expect(result.current.cascade).not.toBeNull();
    });

expect(mockGetTournamentStats).toHaveBeenCalledTimes(1);

void rerender({ id: TOURNAMENT_ID });

await new Promise((r) => setTimeout(r, 50));
expect(mockGetTournamentStats).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.7.C6 — useTournamentCascade: error path', () => {
it('AC #4: TOURNAMENT_NOT_FOUND surfaces without retry', async () => {
const apiError = makeApiError('TOURNAMENT_NOT_FOUND', 404, 'req-nf-1');
mockGetTournamentStats.mockRejectedValueOnce(apiError);

const { result } = renderUseTournamentCascade(TOURNAMENT_ID);

await waitFor(
() => {
expect(result.current.error).not.toBeNull();
      },
{ timeout: 5000 },
    );

expect(result.current.error?.code).toBe('TOURNAMENT_NOT_FOUND');
expect(result.current.cascade).toBeNull();
  });

it('AC #4: ADMIN_FORBIDDEN surfaces without retry', async () => {
const apiError = makeApiError('ADMIN_FORBIDDEN', 403, 'req-forbid-1');
mockGetTournamentStats.mockRejectedValueOnce(apiError);

const { result } = renderUseTournamentCascade(TOURNAMENT_ID);

await waitFor(
() => {
expect(result.current.error).not.toBeNull();
      },
{ timeout: 5000 },
    );

expect(result.current.error?.code).toBe('ADMIN_FORBIDDEN');
expect(result.current.cascade).toBeNull();
  });
});

import { act } from '@testing-library/react';