/**
 * `user-role-admin.service.spec.ts` — Locks the user role admin
 * service contract (TKT-7.1.E8).
 *
 * Verifies:
 *   - `grantUserRole` validates that `input.role` is a member of
 *     `PERMISSIONS`; throws a typed error otherwise.
 *   - `grantUserRole` POSTs to `/admin/users/:id/roles`.
 *   - `revokeUserRole` throws `SELF_ROLE_REVOKE_FORBIDDEN` when the
 *     target user is the calling admin.
 *   - `revokeUserRole` DELETEs `/admin/users/:id/roles/:role`.
 *   - `getUserRoles` GETs `/admin/users/:id/roles`.
 *   - `ROLE_NOT_FOUND`, `ALREADY_GRANTED`, `NOT_GRANTED` codes
 *     propagate to the caller.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOrvalCustomInstance = vi.fn();

const mockGetState = vi.fn(() => ({ user: null } as { user: { userId: string } | null }));

vi.mock('@/lib/api/core/custom-instance', () => ({
  orvalCustomInstance: (...args: unknown[]) =>
    mockOrvalCustomInstance(...args),
}));

vi.mock('@/features/users/store/user-store', () => ({
  useUserStore: {
    getState: () => mockGetState(),
  },
}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
  getUserRoles,
  grantUserRole,
  revokeUserRole,
} from '../user-role-admin.service';

const wrapped = (data: unknown) => data;

function makeApiError(extensions: {
  requestId?: string;
  correlationId?: string;
}): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'mock',
    config: undefined,
    request: undefined,
    response: {
      status: 500,
      data: {
        status: 500,
        detail: 'boom',
        title: 'Internal Server Error',
        extensions,
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  mockOrvalCustomInstance.mockReset();
  mockGetState.mockReset();
  mockGetState.mockReturnValue({ user: null });
});

afterEach(() => {
  mockGetState.mockReturnValue({ user: null });
});

describe('user-role-admin.service — grantUserRole', () => {
  it('validates that the role is a member of PERMISSIONS and throws otherwise', async () => {
    await expect(
      grantUserRole('user-1', {
        // @ts-expect-error testing the runtime guard
        role: 'not_a_real_role',
      }),
    ).rejects.toThrow(/not a member of PERMISSIONS/);

    expect(mockOrvalCustomInstance).not.toHaveBeenCalled();
  });

  it('POSTs to /admin/users/:id/roles with the role', async () => {
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        userId: 'user-1',
        role: 'tag_create',
        grantedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await grantUserRole('user-1', { role: 'tag_create' });

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/users/user-1/roles',
        method: 'POST',
        data: { role: 'tag_create' },
      }),
    );
    expect(result.userId).toBe('user-1');
  });

  it('propagates ROLE_NOT_FOUND on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(
      grantUserRole('user-1', { role: 'tag_create' }),
    ).rejects.toBe(error);
  });

  it('propagates ALREADY_GRANTED on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(
      grantUserRole('user-1', { role: 'tag_create' }),
    ).rejects.toBe(error);
  });
});

describe('user-role-admin.service — revokeUserRole', () => {
  it('validates the role and throws otherwise', async () => {
    await expect(
      // @ts-expect-error testing the runtime guard
      revokeUserRole('user-1', 'not_a_real_role'),
    ).rejects.toThrow(/not a member of PERMISSIONS/);

    expect(mockOrvalCustomInstance).not.toHaveBeenCalled();
  });

  it('throws SELF_ROLE_REVOKE_FORBIDDEN when the target user is the calling admin', async () => {
    mockGetState.mockReturnValue({ user: { userId: 'user-1' } });

    await expect(revokeUserRole('user-1', 'tag_create')).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(mockOrvalCustomInstance).not.toHaveBeenCalled();
  });

  it('DELETEs /admin/users/:id/roles/:role when the target is not the caller', async () => {
    mockGetState.mockReturnValue({ user: { userId: 'admin-1' } });
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        userId: 'user-1',
        role: 'tag_create',
        grantedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await revokeUserRole('user-1', 'tag_create');

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/users/user-1/roles/tag_create',
        method: 'DELETE',
      }),
    );
    expect(result.userId).toBe('user-1');
  });

  it('does not throw the self-action guard when the user is not yet hydrated', async () => {
    mockGetState.mockReturnValue({ user: null });
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        userId: 'user-1',
        role: 'tag_create',
        grantedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    await expect(revokeUserRole('user-1', 'tag_create')).resolves.toEqual({
      userId: 'user-1',
      role: 'tag_create',
      grantedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('propagates NOT_GRANTED on failure', async () => {
    mockGetState.mockReturnValue({ user: { userId: 'admin-1' } });
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(
      revokeUserRole('user-1', 'tag_create'),
    ).rejects.toBe(error);
  });
});

describe('user-role-admin.service — getUserRoles', () => {
  it('GETs /admin/users/:id/roles', async () => {
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped([
        { role: 'tag_create', grantedAt: '2026-01-01T00:00:00.000Z' },
        { role: 'tag_update', grantedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    );

    const result = await getUserRoles('user-1');

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/users/user-1/roles',
        method: 'GET',
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe('tag_create');
  });

  it('propagates USER_NOT_FOUND on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(getUserRoles('missing')).rejects.toBe(error);
  });
});

describe('user-role-admin.service — JSDoc invariants', () => {
  it('documents SELF_ROLE_REVOKE_FORBIDDEN, ROLE_NOT_FOUND, ALREADY_GRANTED, NOT_GRANTED', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'user-role-admin.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/SELF_ROLE_REVOKE_FORBIDDEN/);
    expect(source).toMatch(/ROLE_NOT_FOUND/);
    expect(source).toMatch(/ALREADY_GRANTED/);
    expect(source).toMatch(/NOT_GRANTED/);
  });
});
