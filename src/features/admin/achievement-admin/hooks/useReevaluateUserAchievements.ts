'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { addAchievementAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
reevaluateUserAchievements,
type AchievementReevaluateResponseDto,
} from '@/features/admin/services/achievement-admin.service';
import { isReevalTerminal,
REEVAL_LIFECYCLE_COMPLETED,
REEVAL_LIFECYCLE_FAILED,
REEVAL_LIFECYCLE_IDLE,
REEVAL_LIFECYCLE_RUNNING,
type ReevalLifecycle,
type ReevalJobInfo,
} from '../achievement-admin-types';

import {
invalidateAchievementAdmin,
} from '../cache-keys';

import {
broadcastAchievementAdminMutation,
} from '../broadcast';

export interface UseReevaluateUserAchievementsAudit {

before: AchievementReevaluateResponseDto | null;

after: AchievementReevaluateResponseDto | null;
}

export interface UseReevaluateUserAchievementsResult {

readonly reevaluate: () => Promise<AchievementReevaluateResponseDto>;

readonly lifecycle: ReevalLifecycle;

readonly isPending: boolean;

readonly error: ApiError | null;

readonly audit: UseReevaluateUserAchievementsAudit;

readonly jobInfo: ReevalJobInfo;

readonly reset: () => void;
}

export function useReevaluateUserAchievements(
userId: string,
): UseReevaluateUserAchievementsResult {
const [lifecycle, setLifecycle] = useState<ReevalLifecycle>(REEVAL_LIFECYCLE_IDLE);
const [error, setError] = useState<ApiError | null>(null);
const [audit, setAudit] = useState<UseReevaluateUserAchievementsAudit>({
before: null,
after: null,
  });

const inFlightRef = useRef<Promise<AchievementReevaluateResponseDto> | null>(null);

const invalidate = useCallback(() => {
void invalidateAchievementAdmin(userId, globalMutate);
  }, [userId]);

const reevaluate = useCallback((): Promise<AchievementReevaluateResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
    }

const startedAt = Date.now();

setLifecycle(REEVAL_LIFECYCLE_RUNNING);
setError(null);

addAchievementAdminBreadcrumb({
action: 'achievement.reevaluate',
route: 'achievements.reevaluateUserBadges',
targetId: userId,
status: 'started',
durationMs: 0,
    });

const promise = reevaluateUserAchievements(userId)
      .then((result) => {
const durationMs = Date.now() - startedAt;

setLifecycle(REEVAL_LIFECYCLE_COMPLETED);
setAudit((prev) => ({ ...prev, after: result }));

addAchievementAdminBreadcrumb({
action: 'achievement.reevaluate',
route: 'achievements.reevaluateUserBadges',
targetId: userId,
status: 'success',
durationMs,
        });

invalidate();

broadcastAchievementAdminMutation({
action: 'reevaluate',
userId,
requestId: (result as unknown as { requestId?: string }).requestId ?? '',
        });

return result;
      })
      .catch((err: ApiError) => {
const durationMs = Date.now() - startedAt;
const apiError = err as ApiError;

const isTerminal = isReevalTerminal(apiError.code as ReevalLifecycle);

if (apiError.code === 'REVAL_RUNNING') {

setError(apiError);
        } else {
setLifecycle(isTerminal ? (apiError.code as ReevalLifecycle) : REEVAL_LIFECYCLE_FAILED);
setError(apiError);
        }

addAchievementAdminBreadcrumb({
action: 'achievement.reevaluate',
route: 'achievements.reevaluateUserBadges',
targetId: userId,
status: 'failure',
durationMs,
code: apiError.code,
requestId: apiError.requestId as string | undefined,
correlationId: apiError.correlationId as string | undefined,
        });

return Promise.reject(apiError);
      })
      .finally(() => {
inFlightRef.current = null;
      });

inFlightRef.current = promise;
return promise;
  }, [userId, invalidate, audit.before]);

const reset = useCallback(() => {
setLifecycle(REEVAL_LIFECYCLE_IDLE);
setError(null);
setAudit({ before: null, after: null });
inFlightRef.current = null;
  }, []);

return {
reevaluate,
lifecycle,
isPending: lifecycle === REEVAL_LIFECYCLE_RUNNING,
error,
audit,
jobInfo: {
isJobIdExposed: false,
lifecycle,
    },
reset,
  };
}
