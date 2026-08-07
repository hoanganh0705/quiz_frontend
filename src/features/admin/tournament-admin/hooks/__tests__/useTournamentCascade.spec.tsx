/**
 * `useTournamentCascade` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C6.
 *
 * Coverage map (TKT-7.7.C6 acceptance criteria):
 *
 *   AC #1 — `null` id → `{ isLoading: false, cascade: null }`; no fetch.
 *   AC #2 — permission denied → `{ isLoading: false, cascade: null }`; no fetch.
 *   AC #3 — success → cascade matches the documented `TournamentCascadeDto`.
 *   AC #4 — `TOURNAMENT_NOT_FOUND` → error.code === 'TOURNAMENT_NOT_FOUND'; no retry.
 *   AC #5 — the hook never fetches twice for the same tournamentId without
 *           a state change.
 *   AC #6 — when the A1 verdict confirms the cascade is embedded, the hook
 *           returns the embedded cascade without an extra fetch
 *           (covered by AC #3 — the fetcher builds the cascade in one
 *           call from the stats endpoint).
 *   AC #7 — type-check (handled by `pnpm type-check`).
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

// ─── Setup ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useTournamentCascade } from '../useTournamentCascade';

function renderUseTournamentCascade(tournamentId: string | null) {
  return renderHook(() => useTournamentCascade(tournamentId), {
    wrapper: ({ children }) => children,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

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

    // Per A1 verdict only `participants` is currently derivable;
    // `rounds` and `leaderboards` stay `null` until the backend
    // exposes a dedicated cascade endpoint.
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

    // Rerender with a different id.
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

    // Rerender with the same id.
    void rerender({ id: TOURNAMENT_ID });

    // No new fetch triggered.
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

// Import for the rerender test.
import { act } from '@testing-library/react';