

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAchievementsSdk = {
reevaluateUserBadges: vi.fn(),
revokeUserBadge: vi.fn(),
};

vi.mock('@/lib/api', () => ({
getAchievements: () => mockAchievementsSdk,
}));

vi.mock('@/lib/api/generated/achievements/achievements', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
reevaluateUserAchievements,
revokeUserBadge,
} from '../achievement-admin.service';

const REEVAL_RESULT = {
message: 'reevaluation complete',
checked: 12,
awarded: 2,
errors: 0,
};

const wrapped = (data: unknown) => ({
data: data,
meta: { requestId: 'req-1' },
});

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
Object.values(mockAchievementsSdk).forEach((fn) => fn.mockReset());
});

describe('achievement-admin.service — reevaluateUserAchievements', () => {
it('calls reevaluateUserBadges with the userId and unwraps the response', async () => {
mockAchievementsSdk.reevaluateUserBadges.mockResolvedValueOnce(
wrapped(REEVAL_RESULT),
    );

const result = await reevaluateUserAchievements('user-1');

expect(mockAchievementsSdk.reevaluateUserBadges).toHaveBeenCalledWith(
'user-1',
    );
expect(result.message).toBe('reevaluation complete');
expect(result.checked).toBe(12);
expect(result.awarded).toBe(2);
  });

it('propagates REVAL_RUNNING without retry', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockAchievementsSdk.reevaluateUserBadges.mockRejectedValueOnce(error);

await expect(reevaluateUserAchievements('user-1')).rejects.toBe(error);
expect(mockAchievementsSdk.reevaluateUserBadges).toHaveBeenCalledTimes(1);
  });
});

describe('achievement-admin.service — revokeUserBadge', () => {
it('calls revokeUserBadge with userId and badgeId', async () => {
mockAchievementsSdk.revokeUserBadge.mockResolvedValueOnce(undefined);

const result = await revokeUserBadge('user-1', 'badge-1');

expect(mockAchievementsSdk.revokeUserBadge).toHaveBeenCalledWith(
'user-1',
'badge-1',
    );
expect(result.userId).toBe('user-1');
expect(result.badgeId).toBe('badge-1');
  });

it('propagates BADGE_NOT_GRANTED', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockAchievementsSdk.revokeUserBadge.mockRejectedValueOnce(error);

await expect(revokeUserBadge('user-1', 'badge-1')).rejects.toBe(error);
  });
});

describe('achievement-admin.service — JSDoc invariants', () => {
it('revokeUserBadge documents BADGE_NOT_GRANTED', () => {
const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', 'achievement-admin.service.ts');
const source = readFileSync(sourcePath, 'utf-8');
expect(source).toMatch(/revokeUserBadge[\s\S]{0,1200}BADGE_NOT_GRANTED/);
  });

it('reevaluateUserAchievements documents REVAL_RUNNING', () => {
const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', 'achievement-admin.service.ts');
const source = readFileSync(sourcePath, 'utf-8');
expect(source).toMatch(
/reevaluateUserAchievements[\s\S]{0,1000}REVAL_RUNNING/,
    );
  });
});
