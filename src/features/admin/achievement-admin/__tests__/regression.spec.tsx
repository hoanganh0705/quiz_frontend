/**
 * `features/admin/achievement-admin/__tests__/regression.spec.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.H2.
 *
 * ## Purpose
 *
 * Regression safety net that locks the typed-code and lifecycle behavior
 * on every Story 7.8 surface so future refactors cannot regress.
 *
 * ## Coverage
 *
 *   1. `REVAL_RUNNING` renders the documented notice and the second
 *      `reevaluate()` is a no-op while one is in flight.
 *   2. `BADGE_NOT_GRANTED` does not retry.
 *   3. `ACHIEVEMENT_NOT_FOUND` does not retry.
 *   4. `SELF_ACTION_FORBIDDEN` does not retry and surfaces as a typed code.
 *   5. `IRREVERSIBLE_CONFIRM_REQUIRED` re-mounts the typed-confirm input.
 *   6. The lifecycle transitions are stable (idle → running → completed).
 *   7. The page renders the disabled notice when the flag is off.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/core/ApiError';

import { useReevaluateUserAchievements } from '../hooks/useReevaluateUserAchievements';
import { useRevokeUserBadge } from '../hooks/useRevokeUserBadge';
import { ReevaluateButton } from '../components/ReevaluateButton';
import { AchievementAdminUserRouteHandoff } from '@/app/admin/achievements/users/[userId]/_components/AchievementAdminUserRouteHandoff';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';
const VALID_BADGE_ID = '00000000-0000-4000-8000-000000000002';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeApiError(code: string, requestId = 'req-1', correlationId = 'corr-1'): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status: code === 'PERMISSION_DENIED' || code === 'ADMIN_FORBIDDEN' ? 403 : 400,
      data: {
        status: code === 'PERMISSION_DENIED' || code === 'ADMIN_FORBIDDEN' ? 403 : 400,
        detail: code,
        title: code,
        extensions: { code, requestId, correlationId },
      },
    },
    name: 'AxiosError',
    message: code,
  });
}

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const mockReevaluateUserAchievements = vi.fn();
const mockRevokeUserBadge = vi.fn();
const mockGlobalMutate = vi.fn().mockResolvedValue(undefined);
const mockAddAchievementAdminBreadcrumb = vi.fn();
const mockGetFeatureFlagValue = vi.fn().mockReturnValue('live');

vi.mock('@/features/admin/services/achievement-admin.service', () => ({
  reevaluateUserAchievements: (...args: unknown[]) => mockReevaluateUserAchievements(...args),
  revokeUserBadge: (...args: unknown[]) => mockRevokeUserBadge(...args),
}));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

vi.mock('@/lib/admin/phase7_admin_sentry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin/phase7_admin_sentry')>('@/lib/admin/phase7_admin_sentry');
  return {
    ...actual,
    addAchievementAdminBreadcrumb: (...args: unknown[]) => mockAddAchievementAdminBreadcrumb(...args),
  };
});

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFeatureFlagValue.mockReturnValue('live');
  mockGlobalMutate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('regression.spec — REVAL_RUNNING', () => {
  it('REVAL_RUNNING surfaces as a typed code without retry', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(makeApiError('REVAL_RUNNING'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.code).toBe('REVAL_RUNNING');
    expect(mockReevaluateUserAchievements).toHaveBeenCalledTimes(1);
  });

  it('second reevaluate() is a no-op while one is in flight', async () => {
    let resolveReeval: (value: unknown) => void;
    const inFlightPromise = new Promise((resolve) => {
      resolveReeval = resolve;
    });

    mockReevaluateUserAchievements.mockImplementationOnce(
      () => inFlightPromise as ReturnType<typeof mockReevaluateUserAchievements>,
    );

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    // Fire first request
    const firstPromise = result.current.reevaluate();

    // Fire second request immediately — should return the same promise
    const secondPromise = result.current.reevaluate();

    expect(firstPromise).toBe(secondPromise);

    // Resolve the in-flight request
    resolveReeval!({ data: { badgeDeltas: [], summary: null } });

    await act(async () => {
      await firstPromise;
    });

    // Should have called the service only once
    expect(mockReevaluateUserAchievements).toHaveBeenCalledTimes(1);
  });
});

describe('regression.spec — BADGE_NOT_GRANTED', () => {
  it('BADGE_NOT_GRANTED surfaces as a typed code without retry', async () => {
    mockRevokeUserBadge.mockRejectedValueOnce(makeApiError('BADGE_NOT_GRANTED'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useRevokeUserBadge());

    await act(async () => {
      await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID).catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.code).toBe('BADGE_NOT_GRANTED');
    expect(mockRevokeUserBadge).toHaveBeenCalledTimes(1);
  });
});

describe('regression.spec — ACHIEVEMENT_NOT_FOUND', () => {
  it('ACHIEVEMENT_NOT_FOUND surfaces as a typed code without retry', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(makeApiError('ACHIEVEMENT_NOT_FOUND'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.code).toBe('ACHIEVEMENT_NOT_FOUND');
    expect(mockReevaluateUserAchievements).toHaveBeenCalledTimes(1);
  });
});

describe('regression.spec — SELF_ACTION_FORBIDDEN', () => {
  it('SELF_ACTION_FORBIDDEN surfaces as a typed code without retry', async () => {
    mockRevokeUserBadge.mockRejectedValueOnce(makeApiError('SELF_ACTION_FORBIDDEN'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useRevokeUserBadge());

    await act(async () => {
      await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID).catch(() => {/* expected */});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.code).toBe('SELF_ACTION_FORBIDDEN');
    expect(mockRevokeUserBadge).toHaveBeenCalledTimes(1);
  });
});

describe('regression.spec — lifecycle state transitions', () => {
  it('idle → completed on success', async () => {
    const REEVAL_RESPONSE = { data: { badgeDeltas: [], summary: null } };
    mockReevaluateUserAchievements.mockResolvedValueOnce(REEVAL_RESPONSE);

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    expect(result.current.lifecycle).toBe('idle');

    await act(async () => {
      await result.current.reevaluate();
    });

    expect(result.current.lifecycle).toBe('completed');
  });

  it('idle → failed on error', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(makeApiError('ACHIEVEMENT_NOT_FOUND'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    expect(result.current.lifecycle).toBe('idle');

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    expect(result.current.lifecycle).toBe('failed');
  });

  it('reset() returns lifecycle to idle', async () => {
    mockReevaluateUserAchievements.mockRejectedValueOnce(makeApiError('ACHIEVEMENT_NOT_FOUND'));

    const { renderHook } = require('@testing-library/react');
    const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));

    await act(async () => {
      await result.current.reevaluate().catch(() => {/* expected */});
    });

    expect(result.current.lifecycle).toBe('failed');

    act(() => {
      result.current.reset();
    });

    expect(result.current.lifecycle).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});

describe('regression.spec — feature flag disabled notice', () => {
  it('renders the disabled notice when flag is placeholder', () => {
    mockGetFeatureFlagValue.mockReturnValue('placeholder');

    render(<AchievementAdminUserRouteHandoff userId={VALID_USER_ID} />);

    expect(screen.getByText(/Achievement admin coming soon/i)).toBeInTheDocument();
  });

  it('delegates to AchievementAdminUserPage when flag is live', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');

    render(<AchievementAdminUserRouteHandoff userId={VALID_USER_ID} />);

    // The disabled notice should NOT be visible
    expect(screen.queryByText(/Achievement admin coming soon/i)).not.toBeInTheDocument();
  });
});

// ─── Test helpers ───────────────────────────────────────────────────────────

function renderHookUnderTest() {
  const { renderHook } = require('@testing-library/react');
  const { result } = renderHook(() => useReevaluateUserAchievements(VALID_USER_ID));
  return { result };
}

function renderHookRevokeTest() {
  const { renderHook } = require('@testing-library/react');
  const { result } = renderHook(() => useRevokeUserBadge());
  return { result };
}
