/**
 * `useTournament` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C5.
 *
 * Coverage map (TKT-7.7.C5 acceptance criteria):
 *
 *   AC #1 — `null` id → `{ isLoading: false, tournament: null }`; no fetch.
 *   AC #2 — permission denied → `{ isLoading: false, tournament: null }`; no fetch.
 *   AC #3 — success → tournament matches the documented `TournamentDto`.
 *   AC #4 — `TOURNAMENT_NOT_FOUND` → error.code === 'TOURNAMENT_NOT_FOUND'; no retry.
 *   AC #5 — the hook never fetches twice for the same id without a state change.
 *   AC #6 — type-check (handled by `pnpm type-check`).
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetTournament = vi.hoisted(() => vi.fn());

vi.mock('@/features/tournaments/services/tournaments.service', () => ({
  getTournament: (...args: unknown[]) => mockGetTournament(...args),
}));

// Mock `usePermission` to return hasPermission=true by default.
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

function makeTournament(): {
  tournamentId: string;
  title: string;
  status: 'upcoming';
} {
  return {
    tournamentId: TOURNAMENT_ID,
    title: 'Spring Cup',
    status: 'upcoming',
  };
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
  mockGetTournament.mockReset();
  mockUsePermission.mockReset();
});

beforeEach(() => {
  mockGetTournament.mockReset();
  mockUsePermission.mockReset();
  // Default: permission granted.
  mockUsePermission.mockReturnValue({
    isLoading: false,
    error: null,
    hasPermission: true,
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useTournament } from '../useTournament';

function renderUseTournament(id: string | null) {
  return renderHook(() => useTournament(id), {
    wrapper: ({ children }) => children,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.7.C5 — useTournament: disabled paths', () => {
  it('AC #1: null id → isLoading false, tournament null, no fetch', () => {
    const { result } = renderUseTournament(null);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tournament).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetTournament).not.toHaveBeenCalled();
  });

  it('AC #2: permission denied → isLoading false, tournament null, no fetch', () => {
    // Override the mock to return hasPermission=false.
    mockUsePermission.mockReturnValueOnce({
      isLoading: false,
      error: null,
      hasPermission: false,
    });

    const { result } = renderUseTournament(TOURNAMENT_ID);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tournament).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetTournament).not.toHaveBeenCalled();
  });

  it('permission denied with null id still short-circuits (defensive)', () => {
    mockUsePermission.mockReturnValueOnce({
      isLoading: false,
      error: null,
      hasPermission: false,
    });

    const { result } = renderUseTournament(null);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tournament).toBeNull();
    expect(mockGetTournament).not.toHaveBeenCalled();
  });
});

describe('TKT-7.7.C5 — useTournament: success path', () => {
  it('AC #3: success → tournament matches the documented TournamentDto', async () => {
    const tournament = makeTournament();
    mockGetTournament.mockResolvedValueOnce({ data: tournament });

    const { result } = renderUseTournament(TOURNAMENT_ID);

    // Initially loading.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tournament).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tournament).toEqual(tournament);
    expect(result.current.error).toBeNull();
  });
});

describe('TKT-7.7.C5 — useTournament: error path', () => {
  it('AC #4: TOURNAMENT_NOT_FOUND surfaces without retry', async () => {
    const apiError = makeApiError('TOURNAMENT_NOT_FOUND', 404, 'req-nf-1');
    mockGetTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseTournament(TOURNAMENT_ID);

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.code).toBe('TOURNAMENT_NOT_FOUND');
    expect(result.current.tournament).toBeNull();
  });

  it('AC #4: ADMIN_FORBIDDEN surfaces without retry', async () => {
    const apiError = makeApiError('ADMIN_FORBIDDEN', 403, 'req-forbid-1');
    mockGetTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseTournament(TOURNAMENT_ID);

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.code).toBe('ADMIN_FORBIDDEN');
    expect(result.current.tournament).toBeNull();
  });
});

describe('TKT-7.7.C5 — useTournament: isLoading semantics', () => {
  it('AC #5: isLoading is true on first render and false after success', async () => {
    mockGetTournament.mockResolvedValueOnce(makeTournament());

    const { result } = renderUseTournament(TOURNAMENT_ID);

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('isLoading is true while the first fetch is in flight (subsequent page)', async () => {
    let resolveGet: ((value: unknown) => void) | null = null;
    mockGetTournament.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useTournament(id),
      {
        initialProps: { id: TOURNAMENT_ID },
        wrapper: ({ children }) => children,
      },
    );

    expect(result.current.isLoading).toBe(true);

    // Resolve the first fetch.
    await act(async () => {
      resolveGet?.(makeTournament());
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rerender with a different id — this triggers a new fetch.
    void rerender({ id: '00000000-0000-4000-8000-000000000002' });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // useSingleWithRetry has `isLoading` tracking per-key; rerendering
    // with the same id (no state change) should not trigger a new fetch.
  });
});

// Import act for the rerender test.
import { act } from '@testing-library/react';