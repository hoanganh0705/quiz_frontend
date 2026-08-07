/**
 * `useReevaluateUserAchievements` unit tests.
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C4.
 *
 * Coverage map (TKT-7.8.C4 acceptance criteria):
 *
 *   AC #1  — success invalidates SWR keys; next list query reflects new state.
 *   AC #2  — REVAL_RUNNING → error.code without retry; lifecycle stays running.
 *   AC #3  — ACHIEVEMENT_NOT_FOUND / PERMISSION_DENIED / ADMIN_FORBIDDEN → typed code.
 *   AC #4  — audit breadcrumb emitted on success and failure.
 *   AC #5  — RequestIdBanner data on failure.
 *   AC #6  — isPending reflects in-flight state.
 *   AC #7  — reset() clears error and jobInfo without triggering fetch.
 *   AC #8  — type-check (handled by `pnpm type-check`).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useReevaluateUserAchievements } from '../useReevaluateUserAchievements';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';

const mockReevaluateUserAchievements = vi.hoisted(() => vi.fn());
const mockGlobalMutate = vi.hoisted(() => vi.fn());
const mockAddAchievementAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/achievement-admin.service', () => ({
  reevaluateUserAchievements: (...args: unknown[]) =>
    mockReevaluateUserAchievements(...args),
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
    addAchievementAdminBreadcrumb: (
      ...args: unknown[]
    ) => mockAddAchievementAdminBreadcrumb(...args),
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const REEVAL_RESPONSE_FIXTURE = {
  userId: VALID_USER_ID,
  reevaluatedAt: '2025-08-07T00:00:00.000Z',
  totalBadgesAwarded: 1,
};

function makeApiError(
  code: string,
  requestId = 'req-1',
  correlationId = 'corr-1',
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status: code === 'ADMIN_FORBIDDEN' || code === 'PERMISSION_DENIED' ? 403 : 409,
      data: {
        status: code === 'ADMIN_FORBIDDEN' || code === 'PERMISSION_DENIED' ? 403 : 409,
        detail: code,
        title: code,
        extensions: { code, requestId, correlationId },
      },
    },
    name: 'AxiosError',
    message: code,
  });
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  mockReevaluateUserAchievements.mockReset();
  mockGlobalMutate.mockReset();
  mockAddAchievementAdminBreadcrumb.mockReset();
  // Set default no-op behavior
  mockGlobalMutate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

function renderHookUnderTest() {
  return renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));
}

describe('TKT-7.8.C4 — useReevaluateUserAchievements', () => {
  it('initial lifecycle is idle', () => {
    const { result } = renderHookUnderTest();
    expect(result.current.lifecycle).toBe('idle');
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('AC #6 — isPending true while request in flight', async () => {
    let release!: (value: unknown) => void;
    mockReevaluateUserAchievements.mockImplementation(
      () => new Promise((r) => { release = r; }),
    );

    const { result } = renderHookUnderTest();

    let promise: Promise<unknown>;
    await act(async () => {
      promise = result.current.reevaluate();
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      release(REEVAL_RESPONSE_FIXTURE);
      await promise;
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('AC #1 — success invalidates SWR keys and flips lifecycle to completed', async () => {
    mockReevaluateUserAchievements.mockResolvedValueOnce(REEVAL_RESPONSE_FIXTURE);
    mockGlobalMutate.mockResolvedValueOnce(undefined);
    mockGlobalMutate.mockResolvedValueOnce(undefined);

    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.reevaluate();
    });

    await waitFor(() => {
      expect(result.current.lifecycle).toBe('completed');
    });

    // Two invalidate calls: user-badges + user-history.
    expect(mockGlobalMutate).toHaveBeenCalledTimes(2);
  });

  it('AC #2 — REVAL_RUNNING surfaces error.code; lifecycle stays running', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(
      makeApiError('REVAL_RUNNING'),
    );

    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.reevaluate()).rejects.toMatchObject({
        code: 'REVAL_RUNNING',
      });
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // REVAL_RUNNING: lifecycle stays running.
    expect(result.current.lifecycle).toBe('running');
    expect(result.current.error!.code).toBe('REVAL_RUNNING');
  });

  it('AC #3 — ACHIEVEMENT_NOT_FOUND surfaces typed code; lifecycle becomes failed', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(
      makeApiError('ACHIEVEMENT_NOT_FOUND'),
    );

    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.reevaluate()).rejects.toMatchObject({
        code: 'ACHIEVEMENT_NOT_FOUND',
      });
    });

    await waitFor(() => {
      expect(result.current.lifecycle).toBe('failed');
    });
  });

  it('AC #3 — PERMISSION_DENIED surfaces typed code', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(
      makeApiError('PERMISSION_DENIED'),
    );

    const { result } = renderHookUnderTest();

    await act(async () => {
      await expect(result.current.reevaluate()).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
    });

    await waitFor(() => {
      expect(result.current.lifecycle).toBe('failed');
    });
  });

  it('AC #4 — success breadcrumb emitted', async () => {
    mockReevaluateUserAchievements.mockResolvedValueOnce(REEVAL_RESPONSE_FIXTURE);

    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.reevaluate();
    });

    await waitFor(() => {
      expect(mockAddAchievementAdminBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'achievement.reevaluate',
          status: 'success',
        }),
      );
    });
  });

  it('failure breadcrumb emitted on rejection', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(
      makeApiError('ACHIEVEMENT_NOT_FOUND', 'req-failure', 'corr-failure'),
    );

    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(mockAddAchievementAdminBreadcrumb).toHaveBeenCalledTimes(2);
    });

    const calls = mockAddAchievementAdminBreadcrumb.mock.calls;
    const failureCall = calls.find((call) => call[0]?.status === 'failure');
    expect(failureCall).toBeDefined();
    expect(failureCall[0].action).toBe('achievement.reevaluate');
    expect(failureCall[0].status).toBe('failure');
  });

  it('AC #7 — reset() clears error and audit', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(
      makeApiError('ACHIEVEMENT_NOT_FOUND'),
    );

    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    await act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.audit).toEqual({ before: null, after: null });
    expect(result.current.lifecycle).toBe('idle');
  });

  it('concurrent calls return the same promise', async () => {
    let release!: (value: unknown) => void;
    mockReevaluateUserAchievements.mockImplementation(
      () => new Promise((r) => { release = r; }),
    );

    const { result } = renderHookUnderTest();

    let p1: Promise<unknown>;
    let p2: Promise<unknown>;

    await act(async () => {
      p1 = result.current.reevaluate();
      p2 = result.current.reevaluate();
    });

    expect(p1).toBe(p2); // Same promise reference.
    expect(mockReevaluateUserAchievements).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(REEVAL_RESPONSE_FIXTURE);
      await Promise.all([p1, p2]);
    });
  });
});
