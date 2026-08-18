

import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/core/ApiError';

import { useReevaluateUserAchievements } from '../hooks/useReevaluateUserAchievements';
import { useRevokeUserBadge } from '../hooks/useRevokeUserBadge';
import { ReevaluateButton } from '../components/ReevaluateButton';
import { AchievementAdminUserRouteHandoff } from '@/app/(protected)/admin/achievements/users/[userId]/_components/AchievementAdminUserRouteHandoff';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';
const VALID_BADGE_ID = '00000000-0000-4000-8000-000000000002';

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

vi.mock('@/lib/admin/admin_live_sentry', async () => {
const actual = await vi.importActual<typeof import('@/lib/admin/admin_live_sentry')>('@/lib/admin/admin_live_sentry');
return {
...actual,
addAchievementAdminBreadcrumb: (...args: unknown[]) => mockAddAchievementAdminBreadcrumb(...args),
  };
});

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue('live');
mockGlobalMutate.mockResolvedValue(undefined);
});

afterEach(() => {
vi.restoreAllMocks();
});

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

const firstPromise = result.current.reevaluate();

const secondPromise = result.current.reevaluate();

expect(firstPromise).toBe(secondPromise);

resolveReeval!({ data: { badgeDeltas: [], summary: null } });

await act(async () => {
await firstPromise;
    });

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

expect(screen.queryByText(/Achievement admin coming soon/i)).not.toBeInTheDocument();
  });
});

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
