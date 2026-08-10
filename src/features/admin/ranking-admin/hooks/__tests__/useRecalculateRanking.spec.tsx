/**
 * `useRecalculateRanking` unit tests.
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.C1.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useRecalculateRanking } from '../useRecalculateRanking';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRecalculateRanking = vi.hoisted(() => vi.fn());
const mockGlobalMutate = vi.hoisted(() => vi.fn());
const mockAddRankingAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockAddAdminAuditBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/ranking-admin.service', () => ({
  recalculateRanking: (...args: unknown[]) => mockRecalculateRanking(...args),
}));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

vi.mock('@/lib/admin/admin_live_sentry', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/admin/admin_live_sentry')>(
      '@/lib/admin/admin_live_sentry',
    );
  return {
    ...actual,
    addRankingAdminBreadcrumb: (...args: unknown[]) =>
      mockAddRankingAdminBreadcrumb(...args),
    addAdminAuditBreadcrumb: (...args: unknown[]) =>
      mockAddAdminAuditBreadcrumb(...args),
  };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const RECALCULATE_RESPONSE_FIXTURE = {
  jobId: 'job-ranking-1',
  status: 'completed' as const,
  startedAt: '2025-08-07T00:00:00.000Z',
};

function makeApiError(
  code: string,
  requestId = 'req-1',
  correlationId = 'corr-1',
  extensions: Record<string, unknown> = {},
): ApiError {
  // Cast to `any` to bypass strict AxiosError generic constraints in the test mock.
  // The ApiError class only needs a structurally AxiosError-like object.
  const error = {
    isAxiosError: true,
    response: {
      status: code === 'PERMISSION_DENIED' ? 403 : 409,
      statusText: '',
      headers: {},
      config: { headers: {} },
      data: {
        status: code === 'PERMISSION_DENIED' ? 403 : 409,
        detail: code,
        title: code,
        extensions: { code, requestId, correlationId, ...extensions },
      },
    },
    name: 'AxiosError',
    message: code,
  };
  return new ApiError(error as unknown as ConstructorParameters<typeof ApiError>[0]);
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  mockRecalculateRanking.mockReset();
  mockGlobalMutate.mockReset();
  mockAddRankingAdminBreadcrumb.mockReset();
  mockAddAdminAuditBreadcrumb.mockReset();
  mockGlobalMutate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

function renderHookUnderTest(options?: { scopeFilter?: string }) {
  return renderHook(() => useRecalculateRanking(options));
}

describe('TKT-7.9.C1 — useRecalculateRanking', () => {
  it('initial jobStatus is null', () => {
    const { result } = renderHookUnderTest();
    expect(result.current.jobStatus).toBe(null);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.cooldownRemaining).toBe(null);
    expect(result.current.affectedUserCount).toBe(null);
  });

  it('AC #1 — calls service when triggered', async () => {
    mockRecalculateRanking.mockResolvedValueOnce(RECALCULATE_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(mockRecalculateRanking).toHaveBeenCalledTimes(1);
    });
    // The service receives the DTO (periodId: undefined when no scope filter).
    expect(mockRecalculateRanking).toHaveBeenCalledWith({ periodId: undefined });
  });

  it('trigger passes scope filter as periodId to service', async () => {
    mockRecalculateRanking.mockResolvedValueOnce(RECALCULATE_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger({ scopeFilter: 'current_period' });
    });

    await waitFor(() => {
      expect(mockRecalculateRanking).toHaveBeenCalledWith({ periodId: 'current_period' });
    });
  });

  it('AC #6 — invalid scope filter does NOT call service', async () => {
    const { result } = renderHookUnderTest();

    await act(async () => {
      let didThrow = false;
      try {
        await result.current.trigger({ scopeFilter: 'invalid-scope' });
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(true);
    });

    // Wait for state update from setError
    await waitFor(() => {
      expect(result.current.error?.code).toBe('INVALID_PERIOD');
    });

    // Service should NOT have been called (validation happens before service call)
    expect(mockRecalculateRanking).not.toHaveBeenCalled();
  });

  it('AC #2 — OPERATION_RUNNING sets error.code; jobStatus stays running', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(makeApiError('OPERATION_RUNNING'));
    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.trigger()).rejects.toMatchObject({
        code: 'OPERATION_RUNNING',
      });
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error!.code).toBe('OPERATION_RUNNING');
    expect(result.current.jobStatus).toBe('running');
    expect(result.current.isRunning).toBe(false);
  });

  it('AC #3 — OPERATION_COOLDOWN sets cooldownRemaining', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(
      makeApiError('OPERATION_COOLDOWN', 'req-cooldown', 'corr-cooldown', {
        retryAfter: 300,
      }),
    );
    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.trigger()).rejects.toMatchObject({
        code: 'OPERATION_COOLDOWN',
      });
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error!.code).toBe('OPERATION_COOLDOWN');
    expect(result.current.jobStatus).toBe('failed');
    expect(result.current.isRunning).toBe(false);
    expect(result.current.cooldownRemaining).not.toBe(null);
  });

  it('AC #4 — IRREVERSIBLE_CONFIRM_REQUIRED surfaces the typed code', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(
      makeApiError('IRREVERSIBLE_CONFIRM_REQUIRED'),
    );
    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.trigger()).rejects.toMatchObject({
        code: 'IRREVERSIBLE_CONFIRM_REQUIRED',
      });
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error!.code).toBe('IRREVERSIBLE_CONFIRM_REQUIRED');
    expect(result.current.jobStatus).toBe('failed');
  });

  it('AC #7 — success breadcrumb emitted', async () => {
    mockRecalculateRanking.mockResolvedValueOnce(RECALCULATE_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(mockAddAdminAuditBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ranking.recalculate',
          status: 'success',
          after: RECALCULATE_RESPONSE_FIXTURE,
        }),
      );
    });
  });

  it('failure breadcrumb emitted on rejection', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(
      makeApiError('PERMISSION_DENIED', 'req-failure', 'corr-failure'),
    );
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(mockAddRankingAdminBreadcrumb).toHaveBeenCalledTimes(2);
    });

    const calls = mockAddRankingAdminBreadcrumb.mock.calls;
    const failureCall = calls.find((call) => call[0]?.status === 'failure');
    expect(failureCall).toBeDefined();
    if (failureCall) {
      expect(failureCall[0].action).toBe('ranking.recalculate');
      expect(failureCall[0].status).toBe('failure');
      expect(failureCall[0].requestId).toBe('req-failure');
      expect(failureCall[0].correlationId).toBe('corr-failure');
    }
  });

  it('AC #9 — never retries on 4xx / 5xx', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(
      makeApiError('PERMISSION_DENIED'),
    );
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Service should have been called exactly once (no retry).
    expect(mockRecalculateRanking).toHaveBeenCalledTimes(1);
  });

  it('reset() clears error, jobStatus, cooldown, and audit', async () => {
    mockRecalculateRanking.mockRejectedValueOnce(makeApiError('OPERATION_RUNNING'));
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    await act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.jobStatus).toBe(null);
    expect(result.current.cooldownRemaining).toBe(null);
    expect(result.current.audit).toEqual({ before: null, after: null });
    expect(result.current.isRunning).toBe(false);
  });

  it('concurrent calls only call the service once', async () => {
    mockRecalculateRanking.mockResolvedValueOnce(RECALCULATE_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    // Fire two calls synchronously. Only one should reach the service.
    const p1 = result.current.trigger();
    void result.current.trigger();

    // Both should resolve (the second returns the first's promise).
    await act(async () => {
      await p1;
    });

    // Service should have been called exactly once.
    expect(mockRecalculateRanking).toHaveBeenCalledTimes(1);
  });

  it('affectedUserCount is always null (backend does not return it)', async () => {
    mockRecalculateRanking.mockResolvedValueOnce(RECALCULATE_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(result.current.jobStatus).toBe('completed');
    });

    // A1 §2.3 confirmed: backend does not return affectedUserCount for recalculate.
    expect(result.current.affectedUserCount).toBe(null);
  });
});
