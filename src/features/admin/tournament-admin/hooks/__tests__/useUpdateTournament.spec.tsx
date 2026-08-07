/**
 * `useUpdateTournament` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C3.
 *
 * Coverage map (TKT-7.7.C3 acceptance criteria):
 *
 *   AC #1 — success invalidates admin + public list + public detail keys.
 *   AC #2 — TOURNAMENT_ALREADY_STARTED surfaces without retry.
 *   AC #3 — TOURNAMENT_NOT_FOUND surfaces without retry.
 *   AC #4 — TOURNAMENT_VALIDATION surfaces without retry.
 *   AC #5 — ADMIN_FORBIDDEN surfaces without retry.
 *   AC #6 — `phase7:admin` audit breadcrumb emitted on success and failure.
 *   AC #7 — `RequestIdBanner` data available on failure.
 *   AC #8 — `isPending` reflects in-flight state.
 *   AC #9 — `reset()` clears error without firing another fetch.
 *   AC #10 — type-check (handled by `pnpm type-check`).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateTournament = vi.hoisted(() => vi.fn());
const mockGlobalMutate = vi.hoisted(() => vi.fn());
const mockAddTournamentAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/tournament-admin.service', () => ({
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...args),
}));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

vi.mock('@/lib/admin/phase7_admin_sentry', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/admin/phase7_admin_sentry')>(
      '@/lib/admin/phase7_admin_sentry',
    );
  return {
    ...actual,
    addTournamentAdminBreadcrumb: (
      ...args: unknown[]
    ) => mockAddTournamentAdminBreadcrumb(...args),
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeInput(): {
  title: string;
  startAt: string;
  endAt: string;
} {
  return {
    title: 'Spring Cup (Updated)',
    startAt: '2026-09-01T10:00:00.000Z',
    endAt: '2026-09-01T18:00:00.000Z',
  };
}

function makeUpdatedTournament(): {
  tournamentId: string;
  title: string;
  status: 'upcoming' | 'registration' | 'ongoing' | 'finished' | 'cancelled';
} {
  return {
    tournamentId: TOURNAMENT_ID,
    title: 'Spring Cup (Updated)',
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
  mockUpdateTournament.mockReset();
  mockGlobalMutate.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

beforeEach(() => {
  mockUpdateTournament.mockReset();
  mockGlobalMutate.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useUpdateTournament } from '../useUpdateTournament';

function renderUseUpdateTournament() {
  return renderHook(() => useUpdateTournament());
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.7.C3 — useUpdateTournament: success path', () => {
  it('AC #1: success invalidates admin + public list + public detail keys', async () => {
    mockUpdateTournament.mockResolvedValueOnce(makeUpdatedTournament());
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseUpdateTournament();

    let returned: { tournamentId: string } | null = null;
    await act(async () => {
      returned = await result.current.update(TOURNAMENT_ID, makeInput());
    });

    expect(returned).toEqual(makeUpdatedTournament());

    // The matcher covers admin + public list + per-id public detail.
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
    const matcher = mockGlobalMutate.mock.calls[0]?.[0] as (
      key: unknown,
    ) => boolean;
    expect(matcher(['admin', 'tournaments', 'list', ''])).toBe(true);
    expect(matcher(['admin', 'tournaments', 'detail', 'x'])).toBe(true);
    expect(matcher(['tournaments', 'list', 'q=cup'])).toBe(true);
    expect(
      matcher(['tournaments', 'detail', TOURNAMENT_ID]),
    ).toBe(true);
    // Other tournaments' detail keys do NOT match.
    expect(
      matcher(['tournaments', 'detail', '00000000-0000-4000-8000-000000000002']),
    ).toBe(false);
    // Non-tournament keys do NOT match.
    expect(matcher(['reviews', 'list'])).toBe(false);
  });

  it('AC #6: emits started/success breadcrumbs on success', async () => {
    mockUpdateTournament.mockResolvedValueOnce(makeUpdatedTournament());
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current.update(TOURNAMENT_ID, makeInput());
    });

    const calls = mockAddTournamentAdminBreadcrumb.mock.calls;
    const actions = calls.map((c) => (c[0] as { status: string }).status);
    expect(actions).toContain('started');
    expect(actions).toContain('success');

    const successCall = calls.find(
      (c) => (c[0] as { status: string }).status === 'success',
    );
    const successPayload = successCall?.[0] as {
      action: string;
      targetId?: string;
    };
    expect(successPayload.action).toBe('tournament.update');
    expect(successPayload.targetId).toBe(TOURNAMENT_ID);
  });

  it('AC #8: isPending reflects the in-flight state', async () => {
    let resolveUpdate: ((value: unknown) => void) | null = null;
    mockUpdateTournament.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const { result } = renderUseUpdateTournament();

    let inflightPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      inflightPromise = result.current.update(TOURNAMENT_ID, makeInput());
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveUpdate?.(makeUpdatedTournament());
      await inflightPromise;
    });

    expect(result.current.isPending).toBe(false);
  });
});

describe('TKT-7.7.C3 — useUpdateTournament: error paths', () => {
  it('AC #2: TOURNAMENT_ALREADY_STARTED surfaces without retry', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_ALREADY_STARTED',
      409,
      'req-already-1',
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_ALREADY_STARTED');
    expect(result.current.error?.requestId).toBe('req-already-1');
    // The catch-path's NOT_FOUND revalidation does NOT fire for
    // TOURNAMENT_ALREADY_STARTED.
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

  it('AC #3: TOURNAMENT_NOT_FOUND surfaces without retry, and revalidates admin + detail keys', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_NOT_FOUND',
      404,
      'req-notfound-1',
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_NOT_FOUND');
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it('AC #4: TOURNAMENT_VALIDATION surfaces without retry', async () => {
    const apiError = makeApiError('TOURNAMENT_VALIDATION', 400, 'req-val-1');
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_VALIDATION');
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

  it('AC #5: ADMIN_FORBIDDEN surfaces without retry', async () => {
    const apiError = makeApiError('ADMIN_FORBIDDEN', 403, 'req-forbid-1');
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('ADMIN_FORBIDDEN');
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

  it('AC #6: emits a failure breadcrumb with typed code + requestId', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_ALREADY_STARTED',
      409,
      'req-already-2',
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current
        .update(TOURNAMENT_ID, makeInput())
        .catch(() => undefined);
    });

    const failureCall = mockAddTournamentAdminBreadcrumb.mock.calls.find(
      (c) => (c[0] as { status: string }).status === 'failure',
    );
    expect(failureCall).toBeDefined();
    const payload = failureCall?.[0] as {
      action: string;
      code?: string;
      requestId?: string;
    };
    expect(payload.action).toBe('tournament.update');
    expect(payload.code).toBe('TOURNAMENT_ALREADY_STARTED');
    expect(payload.requestId).toBe('req-already-2');
  });
});

describe('TKT-7.7.C3 — useUpdateTournament: reset + audit snapshot', () => {
  it('AC #9: reset() clears error without firing another fetch', async () => {
    const apiError = makeApiError('TOURNAMENT_VALIDATION', 400, 'req-val-2');
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current
        .update(TOURNAMENT_ID, makeInput())
        .catch(() => undefined);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.audit.beforeTournamentId).toBeNull();
    expect(result.current.audit.afterTournament).toBeNull();
    expect(mockUpdateTournament).toHaveBeenCalledTimes(1);
  });

  it('audit snapshot captures before / after tournament on success', async () => {
    const updated = makeUpdatedTournament();
    mockUpdateTournament.mockResolvedValueOnce(updated);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseUpdateTournament();

    const input = makeInput();
    await act(async () => {
      await result.current.update(TOURNAMENT_ID, input);
    });

    expect(result.current.audit.beforeTournamentId).toBe(TOURNAMENT_ID);
    expect(result.current.audit.beforeInput).toEqual(input);
    expect(result.current.audit.afterTournamentId).toBe(TOURNAMENT_ID);
    expect(result.current.audit.afterTournament).toEqual(updated);
  });
});