/**
 * `useTournamentAdminList` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C1.
 *
 * Coverage map (TKT-7.7.C1 acceptance criteria):
 *
 *   AC #1 — loading → `{ isLoading: true, items: [] }`.
 *   AC #2 — success with a single page → items matches response.
 *   AC #3 — `loadMore()` appends the next page; duplicates removed.
 *   AC #4 — error → `error.code` typed; items remains last-known.
 *   AC #5 — `setFilter({ status: 'active' })` updates the URL.
 *   AC #6 — invalid `?status=` falls back to `''`.
 *   AC #7 — type-check (handled by `pnpm type-check`, not here).
 *
 * The tests run inside `<SWRConfig value={{ provider: () => new Map() }}>`
 * so each `renderHook` call gets an isolated SWR cache.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockListTournaments = vi.hoisted(() => vi.fn());

vi.mock('@/features/tournaments/services/tournaments.service', () => ({
  listTournaments: (...args: unknown[]) => mockListTournaments(...args),
}));

let mockSearchParams: URLSearchParams = new URLSearchParams();
const mockReplace = vi.hoisted(() =>
  vi.fn((url: string) => {
    try {
      const parsed = new URL(url, 'http://localhost');
      mockSearchParams = new URLSearchParams(parsed.search);
    } catch {
      // Swallow — invalid URLs don't crash the spec; the next
      // render still sees the pre-replace state.
    }
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTournament(
  tournamentId: string,
  title = `Tournament ${tournamentId}`,
): { tournamentId: string; title: string; id: string } {
  return { tournamentId, title, id: tournamentId };
}

function makeWireResponse(
  rows: Array<{ tournamentId: string; title: string }>,
  opts: {
    nextCursor?: string | null;
    hasNextPage?: boolean;
  } = {},
): unknown {
  return {
    data: rows,
    meta: {
      pagination: {
        kind: 'cursor',
        limit: rows.length,
        nextCursor: opts.nextCursor ?? null,
        hasNextPage: opts.hasNextPage ?? false,
      },
    },
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks();
  mockListTournaments.mockReset();
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
});

beforeEach(() => {
  mockListTournaments.mockReset();
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderUseTournamentAdminList() {
  return renderHook(() => useTournamentAdminList(), {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

import {
  useTournamentAdminList,
  tournamentAdminListKey,
  tournamentAdminListKeyMatcher,
  isTournamentAdminStatusFilter,
  normalizeTournamentAdminStatusFilter,
} from '../useTournamentAdminList';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.7.C1 — useTournamentAdminList: key & matcher helpers', () => {
  it('tournamentAdminListKey() returns the documented tuple shape', () => {
    expect(tournamentAdminListKey('')).toEqual([
      'admin',
      'tournaments',
      'list',
      '',
    ]);
    expect(tournamentAdminListKey('upcoming')).toEqual([
      'admin',
      'tournaments',
      'list',
      'upcoming',
    ]);
    expect(tournamentAdminListKey('cancelled')).toEqual([
      'admin',
      'tournaments',
      'list',
      'cancelled',
    ]);
  });

  it('tournamentAdminListKeyMatcher() matches every status variant of the admin list', () => {
    expect(
      tournamentAdminListKeyMatcher([
        'admin',
        'tournaments',
        'list',
        'upcoming',
      ]),
    ).toBe(true);
    expect(
      tournamentAdminListKeyMatcher(['admin', 'tournaments', 'list', '']),
    ).toBe(true);
    // Detail-key variants also match (the matcher is namespace-wide).
    expect(
      tournamentAdminListKeyMatcher([
        'admin',
        'tournaments',
        'detail',
        'abc-123',
      ]),
    ).toBe(true);
    // Public-tournament list namespace does NOT match.
    expect(
      tournamentAdminListKeyMatcher(['tournaments', 'list', 'upcoming']),
    ).toBe(false);
    expect(tournamentAdminListKeyMatcher('admin:tournaments:list')).toBe(false);
    expect(tournamentAdminListKeyMatcher(null)).toBe(false);
  });

  it('isTournamentAdminStatusFilter() narrows the documented set', () => {
    expect(isTournamentAdminStatusFilter('')).toBe(true);
    expect(isTournamentAdminStatusFilter('upcoming')).toBe(true);
    expect(isTournamentAdminStatusFilter('registration')).toBe(true);
    expect(isTournamentAdminStatusFilter('ongoing')).toBe(true);
    expect(isTournamentAdminStatusFilter('finished')).toBe(true);
    expect(isTournamentAdminStatusFilter('cancelled')).toBe(true);
    expect(isTournamentAdminStatusFilter('active')).toBe(false);
    expect(isTournamentAdminStatusFilter(null)).toBe(false);
    expect(isTournamentAdminStatusFilter(undefined)).toBe(false);
    expect(isTournamentAdminStatusFilter(123)).toBe(false);
  });

  it('normalizeTournamentAdminStatusFilter() falls back to the documented default', () => {
    expect(normalizeTournamentAdminStatusFilter('upcoming')).toBe('upcoming');
    expect(normalizeTournamentAdminStatusFilter('ongoing')).toBe('ongoing');
    expect(normalizeTournamentAdminStatusFilter('bogus')).toBe('');
    expect(normalizeTournamentAdminStatusFilter(null)).toBe('');
    expect(normalizeTournamentAdminStatusFilter(undefined)).toBe('');
  });
});

describe('TKT-7.7.C1 — useTournamentAdminList: happy path & pagination', () => {
  it('AC #1: initial render surfaces loading then success with the documented shape', async () => {
    mockListTournaments.mockResolvedValueOnce(
      makeWireResponse([makeTournament('t-1'), makeTournament('t-2')], {
        nextCursor: 'cur-next',
        hasNextPage: true,
      }),
    );

    const { result } = renderUseTournamentAdminList();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // AC #2: items matches response; error is null; filter surfaces
    // the empty default (status undefined, search '').
    expect(result.current.items.map((it) => it.tournamentId)).toEqual([
      't-1',
      't-2',
    ]);
    expect(result.current.error).toBeNull();
    expect(result.current.filter).toEqual({ status: undefined, search: '' });
  });

  it('AC #3: loadMore() appends the next page and deduplicates overlapping ids', async () => {
    mockListTournaments
      .mockResolvedValueOnce(
        makeWireResponse([makeTournament('t-1'), makeTournament('t-2')], {
          nextCursor: 'cur-2',
          hasNextPage: true,
        }),
      )
      .mockResolvedValueOnce(
        makeWireResponse([makeTournament('t-2'), makeTournament('t-3')], {
          nextCursor: null,
          hasNextPage: false,
        }),
      );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(3);
    });

    const ids = result.current.items.map((it) => it.tournamentId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['t-1', 't-2', 't-3']);
  });

  it('mutate() delegates to the SWR primitive refresh', async () => {
    mockListTournaments
      .mockResolvedValueOnce(
        makeWireResponse([makeTournament('t-1')], {
          hasNextPage: false,
        }),
      )
      .mockResolvedValueOnce(
        makeWireResponse(
          [makeTournament('t-1'), makeTournament('t-2')],
          { hasNextPage: false },
        ),
      );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    await act(async () => {
      await result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });
  });
});

function makeApiError(code: string, status: number, requestId: string): ApiError {
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

describe('TKT-7.7.C1 — useTournamentAdminList: error surface', () => {
  it('AC #4: error surfaces typed ApiError; items stays empty on first-page failure', async () => {
    const apiError = makeApiError('TOURNAMENT_NOT_FOUND', 404, 'req-err-1');
    mockListTournaments.mockRejectedValue(apiError);

    const { result } = renderUseTournamentAdminList();

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.code).toBe('TOURNAMENT_NOT_FOUND');
    expect(result.current.items).toEqual([]);
  });
});

describe('TKT-7.7.C1 — useTournamentAdminList: URL-owned filter', () => {
  it('AC #5: setFilter({ status: "ongoing" }) updates the URL via router.replace', async () => {
    mockListTournaments.mockResolvedValue(
      makeWireResponse([makeTournament('t-1')], { hasNextPage: false }),
    );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter({ status: 'ongoing', search: '' });
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const replaced = mockReplace.mock.calls[0]?.[0] as string;
    expect(replaced).toContain('status=ongoing');
  });

  it('AC #5 (search): setFilter({ search: "cup" }) updates the URL via router.replace', async () => {
    mockListTournaments.mockResolvedValue(
      makeWireResponse([makeTournament('t-1', 'Spring Cup')], {
        hasNextPage: false,
      }),
    );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter({ status: undefined, search: 'cup' });
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const replaced = mockReplace.mock.calls[0]?.[0] as string;
    expect(replaced).toContain('q=cup');
  });

  it('AC #5 (status reset): setFilter({ status: undefined }) strips the ?status= param', async () => {
    // Pre-seed the URL with a status filter.
    mockSearchParams = new URLSearchParams('status=ongoing');
    mockListTournaments.mockResolvedValue(
      makeWireResponse([makeTournament('t-1')], { hasNextPage: false }),
    );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter({ status: undefined, search: '' });
    });

    const replaced = mockReplace.mock.calls[0]?.[0] as string;
    expect(replaced).not.toContain('status=');
  });

  it('AC #6: invalid ?status= value falls back to "" (all)', async () => {
    mockSearchParams = new URLSearchParams('status=bogus');

    mockListTournaments.mockResolvedValueOnce(
      makeWireResponse([makeTournament('t-1')], { hasNextPage: false }),
    );

    const { result } = renderUseTournamentAdminList();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // filter.status is undefined (i.e. "all") when the URL is invalid.
    expect(result.current.filter.status).toBeUndefined();
  });
});