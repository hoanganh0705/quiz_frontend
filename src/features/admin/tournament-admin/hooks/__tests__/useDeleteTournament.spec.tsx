/**
 * `useDeleteTournament` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C4.
 *
 * Coverage map (TKT-7.7.C4 acceptance criteria):
 *
 *   AC #1 — success invalidates admin + public list + public detail keys.
 *   AC #2 — TOURNAMENT_HAS_PARTICIPANTS surfaces without retry; dialog
 *           stays in cascade-warning mode.
 *   AC #3 — TOURNAMENT_ALREADY_STARTED surfaces without retry.
 *   AC #4 — TOURNAMENT_NOT_FOUND surfaces without retry.
 *   AC #5 — IRREVERSIBLE_CONFIRM_REQUIRED surfaces without retry.
 *   AC #6 — ADMIN_FORBIDDEN surfaces without retry.
 *   AC #7 — emits the audit breadcrumb; typed-confirm string + cascade
 *           counts are redacted from the breadcrumb payload.
 *   AC #8 — RequestIdBanner data available on failure.
 *   AC #9 — isPending reflects in-flight state.
 *   AC #10 — reset() clears error without firing another fetch.
 *   AC #11 — type-check (handled by `pnpm type-check`).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDeleteTournament = vi.hoisted(() => vi.fn());
const mockGlobalMutate = vi.hoisted(() => vi.fn());
const mockAddTournamentAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/tournament-admin.service', () => ({
  deleteTournament: (...args: unknown[]) => mockDeleteTournament(...args),
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
  mockDeleteTournament.mockReset();
  mockGlobalMutate.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

beforeEach(() => {
  mockDeleteTournament.mockReset();
  mockGlobalMutate.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useDeleteTournament } from '../useDeleteTournament';

function renderUseDeleteTournament() {
  return renderHook(() => useDeleteTournament());
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.7.C4 — useDeleteTournament: success path', () => {
  it('AC #1: success invalidates admin + public list + public detail keys', async () => {
    mockDeleteTournament.mockResolvedValueOnce(undefined);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await result.current.remove(TOURNAMENT_ID);
    });

    expect(mockDeleteTournament).toHaveBeenCalledWith(TOURNAMENT_ID);
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
    const matcher = mockGlobalMutate.mock.calls[0]?.[0] as (
      key: unknown,
    ) => boolean;
    expect(matcher(['admin', 'tournaments', 'list', ''])).toBe(true);
    expect(matcher(['tournaments', 'list', 'q=cup'])).toBe(true);
    expect(
      matcher(['tournaments', 'detail', TOURNAMENT_ID]),
    ).toBe(true);
    expect(matcher(['reviews', 'list'])).toBe(false);
  });

  it('AC #7: success breadcrumb carries the action + targetId', async () => {
    mockDeleteTournament.mockResolvedValueOnce(undefined);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await result.current.remove(TOURNAMENT_ID, {
        confirmString: 'DELETE TOURNAMENT',
      });
    });

    const successCall = mockAddTournamentAdminBreadcrumb.mock.calls.find(
      (c) => (c[0] as { status: string }).status === 'success',
    );
    expect(successCall).toBeDefined();
    const payload = successCall?.[0] as {
      action: string;
      targetId?: string;
    };
    expect(payload.action).toBe('tournament.delete');
    expect(payload.targetId).toBe(TOURNAMENT_ID);
  });

  it('AC #7: typed-confirm string is captured as length only (never in payload)', async () => {
    mockDeleteTournament.mockResolvedValueOnce(undefined);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await result.current.remove(TOURNAMENT_ID, {
        confirmString: 'DELETE TOURNAMENT',
      });
    });

    // Inspect every breadcrumb payload — confirm-string text must
    // NEVER appear.
    for (const call of mockAddTournamentAdminBreadcrumb.mock.calls) {
      const payload = call[0] as Record<string, unknown>;
      const json = JSON.stringify(payload);
      expect(json).not.toContain('DELETE TOURNAMENT');
    }

    expect(result.current.audit.confirmedStringLength).toBe(
      'DELETE TOURNAMENT'.length,
    );
  });

  it('AC #9: isPending reflects the in-flight state', async () => {
    let resolveDelete: ((value: unknown) => void) | null = null;
    mockDeleteTournament.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );

    const { result } = renderUseDeleteTournament();

    let inflightPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      inflightPromise = result.current.remove(TOURNAMENT_ID);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveDelete?.(undefined);
      await inflightPromise;
    });

    expect(result.current.isPending).toBe(false);
  });

  it('`delete` ergonomic alias points to the same remove function', async () => {
    mockDeleteTournament.mockResolvedValueOnce(undefined);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseDeleteTournament();

    expect(result.current.delete).toBe(result.current.remove);

    await act(async () => {
      await result.current.delete(TOURNAMENT_ID);
    });

    expect(mockDeleteTournament).toHaveBeenCalledWith(TOURNAMENT_ID);
  });
});

describe('TKT-7.7.C4 — useDeleteTournament: error paths', () => {
  it('AC #2: TOURNAMENT_HAS_PARTICIPANTS surfaces without retry', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_HAS_PARTICIPANTS',
      409,
      'req-parts-1',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await expect(
        result.current.remove(TOURNAMENT_ID),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_HAS_PARTICIPANTS');
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

  it('AC #3: TOURNAMENT_ALREADY_STARTED surfaces without retry', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_ALREADY_STARTED',
      409,
      'req-already-1',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await expect(
        result.current.remove(TOURNAMENT_ID),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_ALREADY_STARTED');
  });

  it('AC #4: TOURNAMENT_NOT_FOUND surfaces without retry and revalidates admin + detail keys', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_NOT_FOUND',
      404,
      'req-notfound-1',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await expect(
        result.current.remove(TOURNAMENT_ID),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('TOURNAMENT_NOT_FOUND');
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it('AC #5: IRREVERSIBLE_CONFIRM_REQUIRED surfaces without retry', async () => {
    const apiError = makeApiError(
      'IRREVERSIBLE_CONFIRM_REQUIRED',
      412,
      'req-confirm-1',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await expect(
        result.current.remove(TOURNAMENT_ID, { confirmString: 'wrong' }),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe(
      'IRREVERSIBLE_CONFIRM_REQUIRED',
    );
  });

  it('AC #6: ADMIN_FORBIDDEN surfaces without retry', async () => {
    const apiError = makeApiError('ADMIN_FORBIDDEN', 403, 'req-forbid-1');
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await expect(
        result.current.remove(TOURNAMENT_ID),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe('ADMIN_FORBIDDEN');
  });

  it('AC #7/AC #8: emits failure breadcrumb with typed code + requestId', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_HAS_PARTICIPANTS',
      409,
      'req-parts-2',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await result.current
        .remove(TOURNAMENT_ID, { confirmString: 'DELETE TOURNAMENT' })
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
      redactedPayload?: Record<string, unknown>;
    };
    expect(payload.action).toBe('tournament.delete');
    expect(payload.code).toBe('TOURNAMENT_HAS_PARTICIPANTS');
    expect(payload.requestId).toBe('req-parts-2');

    // Breadcrumb payload NEVER contains the typed-confirm string.
    expect(JSON.stringify(payload)).not.toContain('DELETE TOURNAMENT');

    // AC #8: RequestIdBanner data (requestId) is available on the
    // error object so the dialog can surface it.
    expect(result.current.error?.requestId).toBe('req-parts-2');
  });
});

describe('TKT-7.7.C4 — useDeleteTournament: reset + audit snapshot', () => {
  it('AC #10: reset() clears error without firing another fetch', async () => {
    const apiError = makeApiError(
      'TOURNAMENT_HAS_PARTICIPANTS',
      409,
      'req-parts-3',
    );
    mockDeleteTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseDeleteTournament();

    await act(async () => {
      await result.current
        .remove(TOURNAMENT_ID)
        .catch(() => undefined);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.audit.beforeTournamentId).toBeNull();
    expect(mockDeleteTournament).toHaveBeenCalledTimes(1);
  });
});