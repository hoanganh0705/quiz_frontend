

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useRevokeUserBadge } from '../useRevokeUserBadge';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';
const VALID_BADGE_ID = '00000000-0000-4000-8000-000000000002';

const { mockRevokeUserBadge, mockGlobalMutate, mockAddAchievementAdminBreadcrumb } = vi.hoisted(() => ({
mockRevokeUserBadge: vi.fn(),
mockGlobalMutate: vi.fn(),
mockAddAchievementAdminBreadcrumb: vi.fn(),
}));

vi.mock('@/features/admin/services/achievement-admin.service', () => ({
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

const REVOKE_RESPONSE_FIXTURE = {
userId: VALID_USER_ID,
badgeId: VALID_BADGE_ID,
revokedAt: '2025-08-07T00:00:00.000Z',
};

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

beforeEach(() => {
mockRevokeUserBadge.mockReset();
mockGlobalMutate.mockReset();
mockAddAchievementAdminBreadcrumb.mockReset();
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('useRevokeUserBadge', () => {
it('initial isPending is false', () => {
const { result } = renderHook(() => useRevokeUserBadge());
expect(result.current.isPending).toBe(false);
expect(result.current.error).toBe(null);
  });

it('success invalidates SWR keys', async () => {
mockRevokeUserBadge.mockResolvedValue(REVOKE_RESPONSE_FIXTURE);
const { result } = renderHook(() => useRevokeUserBadge());
await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID);
await waitFor(() => {
expect(result.current.audit.after).not.toBeNull();
    });
expect(mockGlobalMutate).toHaveBeenCalledTimes(2);
expect(result.current.isPending).toBe(false);
expect(result.current.audit.after).toEqual(REVOKE_RESPONSE_FIXTURE);
  });

it('error surfaces error.code', async () => {
mockRevokeUserBadge.mockRejectedValue(makeApiError('BADGE_NOT_GRANTED'));
const { result } = renderHook(() => useRevokeUserBadge());
await expect(
result.current.revoke(VALID_USER_ID, VALID_BADGE_ID),
    ).rejects.toMatchObject({ code: 'BADGE_NOT_GRANTED' });
await waitFor(() => {
expect(result.current.error!.code).toBe('BADGE_NOT_GRANTED');
    });
expect(mockRevokeUserBadge).toHaveBeenCalledTimes(1);
  });

it('invalid userId rejected with hook-level guard', async () => {
const { result } = renderHook(() => useRevokeUserBadge());

try {
await result.current.revoke('not-a-uuid', VALID_BADGE_ID);

expect(false).toBe(true);
    } catch (err) {
expect(err).toBeInstanceOf(ApiError);
expect((err as ApiError).message).toBe('Invalid userId format.');
    }
expect(mockRevokeUserBadge).not.toHaveBeenCalled();
  });

it('invalid badgeId rejected with hook-level guard', async () => {
const { result } = renderHook(() => useRevokeUserBadge());
try {
await result.current.revoke(VALID_USER_ID, 'not-a-badge-uuid');
expect(false).toBe(true);
    } catch (err) {
expect(err).toBeInstanceOf(ApiError);
expect((err as ApiError).message).toBe('Invalid badgeId format.');
    }
expect(mockRevokeUserBadge).not.toHaveBeenCalled();
  });

it('audit breadcrumb emitted on success', async () => {
mockRevokeUserBadge.mockResolvedValue(REVOKE_RESPONSE_FIXTURE);
const { result } = renderHook(() => useRevokeUserBadge());
await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID);
await waitFor(() => {
expect(mockAddAchievementAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'achievement.revokeBadge', status: 'success' }),
      );
    });
  });

it('audit breadcrumb emitted on failure', async () => {
mockRevokeUserBadge.mockRejectedValue(makeApiError('BADGE_NOT_GRANTED', 'req-fail', 'corr-fail'));
const { result } = renderHook(() => useRevokeUserBadge());
await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID).catch(() => {/* expected */});
await waitFor(() => {
expect(mockAddAchievementAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'achievement.revokeBadge', status: 'failure', code: 'BADGE_NOT_GRANTED' }),
      );
    });
  });

it('reset() clears error and audit', async () => {
mockRevokeUserBadge.mockRejectedValue(makeApiError('BADGE_NOT_GRANTED'));
const { result } = renderHook(() => useRevokeUserBadge());
await result.current.revoke(VALID_USER_ID, VALID_BADGE_ID).catch(() => {/* expected */});
await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });
act(() => {
result.current.reset();
    });
expect(result.current.error).toBe(null);
expect(result.current.audit).toEqual({ before: null, after: null });
expect(result.current.isPending).toBe(false);
  });
});
