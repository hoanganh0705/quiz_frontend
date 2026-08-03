/**
 * `users.service.spec.ts` — locks the users service contract (write paths only).
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.F7.
 *
 * Coverage per F7 AC #1:
 *
 *   - Pass-through for `updateMyProfile` and `updateMySettings`.
 *   - TKT-4.1.F6 AC #2: read endpoints are NOT duplicated. This spec
 *     asserts the absence of read functions (no `getCurrentUser`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as usersService from '@/features/users/services/users.service';
import {
  updateMyProfile,
  updateMySettings,
} from '@/features/users/services/users.service';

const userControllerUpdateMeMock = vi.fn();
const userControllerUpdateMeSettingsMock = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getUsers: () => ({
      userControllerUpdateMe: userControllerUpdateMeMock,
      userControllerUpdateMeSettings: userControllerUpdateMeSettingsMock,
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('users.service — pass-through (write paths)', () => {
  it('updateMyProfile forwards the payload and returns the SDK result', async () => {
    const expected = {
      userId: 'u1',
      username: 'new-handle',
      bio: null,
    };
    userControllerUpdateMeMock.mockResolvedValue(expected);

    const result = await updateMyProfile({
      username: 'new-handle',
    } as Parameters<typeof updateMyProfile>[0]);

    expect(userControllerUpdateMeMock).toHaveBeenCalledTimes(1);
    expect(userControllerUpdateMeMock).toHaveBeenCalledWith({
      username: 'new-handle',
    });
    expect(result).toBe(expected);
  });

  it('updateMySettings forwards the payload and returns the SDK result', async () => {
    const expected = {
      userId: 'u1',
      preferences: { theme: 'dark' },
    };
    userControllerUpdateMeSettingsMock.mockResolvedValue(expected);

    const result = await updateMySettings({
      preferences: { theme: 'dark' },
    } as Parameters<typeof updateMySettings>[0]);

    expect(userControllerUpdateMeSettingsMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(expected);
  });
});

describe('users.service — scope guard (no read duplication)', () => {
  it('does NOT export read functions (Phase 2 owns them)', () => {
    // The Phase 4 users.service intentionally contains only write
    // paths. Reads (e.g. `getCurrentUser`) live in
    // `features/users/wrappers/user.wrapper.ts` (Phase 2). This
    // assertion locks the scope to prevent drift.
    const serviceExports = Object.keys(usersService);
    expect(serviceExports).toContain('updateMyProfile');
    expect(serviceExports).toContain('updateMySettings');
    expect(serviceExports).not.toContain('getCurrentUser');
  });
});