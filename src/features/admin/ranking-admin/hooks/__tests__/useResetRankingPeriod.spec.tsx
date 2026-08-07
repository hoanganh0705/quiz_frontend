/**
 * `useResetRankingPeriod` unit tests.
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.C2.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useResetRankingPeriod } from '../useResetRankingPeriod';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockResetRankingPeriod = vi.hoisted(() => vi.fn());
const mockGlobalMutate = vi.hoisted(() => vi.fn());
const mockAddRankingAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockAddAdminAuditBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/ranking-admin.service', () => ({
  resetRankingPeriod: (...args: unknown[]) => mockResetRankingPeriod(...args),
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
    addRankingAdminBreadcrumb: (...args: unknown[]) =>
      mockAddRankingAdminBreadcrumb(...args),
    addAdminAuditBreadcrumb: (...args: unknown[]) =>
      mockAddAdminAuditBreadcrumb(...args),
  };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const RESET_RESPONSE_FIXTURE = {
  jobId: 'job-reset-1',
  status: 'completed' as const,
  periodId: 'current',
  resetAt: '2025-08-07T00:00:00.000Z',
  affectedUserCount: 42,
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

beforeEach(() => {
  mockResetRankingPeriod.mockReset();
  mockGlobalMutate.mockReset();
  mockAddRankingAdminBreadcrumb.mockReset();
  mockAddAdminAuditBreadcrumb.mockReset();
  mockGlobalMutate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

function renderHookUnderTest(options?: { periodIdentifier?: string }) {
  return renderHook(() => useResetRankingPeriod(options));
}

describe('TKT-7.9.C2 — useResetRankingPeriod', () => {
  it('initial jobStatus is null', () => {
    const { result } = renderHookUnderTest();
    expect(result.current.jobStatus).toBe(null);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.cooldownRemaining).toBe(null);
    expect(result.current.showCrossUserWarning).toBe(false);
  });

  it('AC #1 — calls service when triggered', async () => {
    mockResetRankingPeriod.mockResolvedValueOnce(RESET_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(mockResetRankingPeriod).toHaveBeenCalledTimes(1);
    });
    expect(mockResetRankingPeriod).toHaveBeenCalledWith({
      periodId: 'current',
      confirmString: '',
    });
  });

  it('trigger passes period identifier and confirm string to service', async () => {
    mockResetRankingPeriod.mockResolvedValueOnce(RESET_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger({
        periodIdentifier: 'all',
        confirmString: 'ranking.reset',
      });
    });

    await waitFor(() => {
      expect(mockResetRankingPeriod).toHaveBeenCalledWith({
        periodId: 'all',
        confirmString: 'ranking.reset',
      });
    });
  });

  it('AC #6 — invalid period does NOT call service', async () => {
    const { result } = renderHookUnderTest();

    await act(async () => {
      let didThrow = false;
      try {
        await result.current.trigger({ periodIdentifier: 'invalid-period' });
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.error?.code).toBe('INVALID_PERIOD');
    });

    expect(mockResetRankingPeriod).not.toHaveBeenCalled();
  });

  it('AC #2 — OPERATION_RUNNING sets error.code; jobStatus stays running', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(makeApiError('OPERATION_RUNNING'));
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

  it('AC #3 — OPERATION_COOLDOWN sets cooldownRemaining and jobStatus failed', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(
      makeApiError('OPERATION_COOLDOWN', 'req-cd', 'corr-cd', {
        retryAfter: 60,
      }),
    );
    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.trigger()).rejects.toMatchObject({
        code: 'OPERATION_COOLDOWN',
      });
    });

    await waitFor(() => {
      expect(result.current.cooldownRemaining).not.toBeNull();
    });
    expect(result.current.cooldownRemaining).toBe(60);
    expect(result.current.jobStatus).toBe('failed');
    expect(result.current.isRunning).toBe(false);
  });

  it('AC #4 — IRREVERSIBLE_CONFIRM_REQUIRED surfaces with priority copy', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(
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

  it('concurrent calls while in flight do not trigger duplicate service calls', async () => {
    let resolveOuter: ((value: unknown) => void) | null = null;
    mockResetRankingPeriod.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOuter = resolve;
        }),
    );

    const { result } = renderHookUnderTest();

    // First trigger — starts the service call.
    act(() => {
      void result.current.trigger().catch(() => {/* expected */});
    });

    expect(mockResetRankingPeriod).toHaveBeenCalledTimes(1);

    // Second concurrent call while the first is still in flight.
    act(() => {
      void result.current.trigger().catch(() => {/* expected */});
    });

    // Service should still have been called only once.
    expect(mockResetRankingPeriod).toHaveBeenCalledTimes(1);

    if (resolveOuter) {
      (resolveOuter as (value: unknown) => void)(RESET_RESPONSE_FIXTURE);
    }

    await waitFor(() => {
      expect(result.current.jobStatus).toBe('completed');
    });
  });

  it('AC #7 — success breadcrumb emitted via addAdminAuditBreadcrumb', async () => {
    mockResetRankingPeriod.mockResolvedValueOnce(RESET_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(mockAddAdminAuditBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ranking.reset',
          status: 'success',
          after: RESET_RESPONSE_FIXTURE,
        }),
      );
    });
  });

  it('failure breadcrumb emitted on rejection', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(
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
      expect(failureCall[0].action).toBe('ranking.reset');
      expect(failureCall[0].status).toBe('failure');
      expect(failureCall[0].requestId).toBe('req-failure');
      expect(failureCall[0].correlationId).toBe('corr-failure');
    }
  });

  it('AC #9 — invalidates SWR caches on success', async () => {
    mockResetRankingPeriod.mockResolvedValueOnce(RESET_RESPONSE_FIXTURE);
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger();
    });

    await waitFor(() => {
      expect(mockGlobalMutate).toHaveBeenCalled();
    });
  });

  it('showCrossUserWarning is true when a valid period is set', () => {
    const { result } = renderHookUnderTest({ periodIdentifier: 'current' });
    expect(result.current.showCrossUserWarning).toBe(true);
  });

  it('showCrossUserWarning is false when no period is set', () => {
    const { result } = renderHookUnderTest();
    expect(result.current.showCrossUserWarning).toBe(false);
  });

  it('validatePeriod returns valid for known periods', () => {
    const { result } = renderHookUnderTest();
    expect(result.current.validatePeriod('current')).toEqual({ valid: true });
    expect(result.current.validatePeriod('last')).toEqual({ valid: true });
    expect(result.current.validatePeriod('all')).toEqual({ valid: true });
  });

  it('validatePeriod returns invalid for unknown periods', () => {
    const { result } = renderHookUnderTest();
    const result2 = result.current.validatePeriod('bogus');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBeDefined();
  });

  it('reset clears state', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(makeApiError('PERMISSION_DENIED'));
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.jobStatus).toBe(null);
  });

  it('AC #10 — never retries on 4xx / 5xx', async () => {
    mockResetRankingPeriod.mockRejectedValueOnce(makeApiError('PERMISSION_DENIED'));
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.trigger().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(mockResetRankingPeriod).toHaveBeenCalledTimes(1);
    });
    // Wait for failure breadcrumb to be emitted.
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(mockResetRankingPeriod).toHaveBeenCalledTimes(1);
  });
});
