'use client';

export interface UseRecalculateRankingAudit {

before: null;

after: RankingRecalculateResponseDto | null;
}

export interface UseRecalculateRankingResult {

readonly trigger: (options?: {

scopeFilter?: string;

before?: null;
  }) => Promise<RankingRecalculateResponseDto>;

readonly jobStatus: RankingJobStatus | null;

readonly affectedUserCount: null;

readonly error: ApiError | null;

readonly isRunning: boolean;

readonly cooldownRemaining: number | null;

readonly audit: UseRecalculateRankingAudit;

readonly reset: () => void;
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { addRankingAdminBreadcrumb, addAdminAuditBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
recalculateRanking,
type RankingRecalculateResponseDto,
} from '../../services/ranking-admin.service';
import type {
RankingJobStatus,
} from '../ranking-admin-types';
import { parseCooldownFrom } from '../ranking-admin-types';

import {
invalidateRankingCaches,
} from '../ranking-admin-cache';

const RANKING_ACTION = 'ranking.recalculate';
const RANKING_ROUTE = 'rankings.recalculate';

const VALID_SCOPES: readonly string[] = ['current_period', 'last_period', 'all'];

function makeSyntheticError(code: string, message: string): ApiError {
return ApiError.fromInput({
status: 400,
code,
message,
title: code,
  });
}

export function useRecalculateRanking(
options?: { scopeFilter?: string },
): UseRecalculateRankingResult {
const [jobStatus, setJobStatus] = useState<RankingJobStatus | null>(null);
const [error, setError] = useState<ApiError | null>(null);
const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
const [audit, setAudit] = useState<UseRecalculateRankingAudit>({
before: null,
after: null,
  });

const [isRunningLocal, setIsRunningLocal] = useState(false);

const inFlightRef = useRef<Promise<RankingRecalculateResponseDto> | null>(
null,
  );

const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
null,
  );

const invalidate = useCallback(() => {
void invalidateRankingCaches();
  }, []);

const clearCooldown = useCallback(() => {
if (cooldownIntervalRef.current !== null) {
clearInterval(cooldownIntervalRef.current);
cooldownIntervalRef.current = null;
    }
setCooldownRemaining(null);
  }, []);

const startCooldownCountdown = useCallback(
(seconds: number) => {
clearCooldown();
let remaining = seconds;

setCooldownRemaining(remaining);
cooldownIntervalRef.current = setInterval(() => {
remaining -= 1;
if (remaining <= 0) {
clearCooldown();
        } else {
setCooldownRemaining(remaining);
        }
      }, 1000);
    },
[clearCooldown],
  );

const trigger = useCallback(
async (
opts?: { scopeFilter?: string; before?: null },
    ): Promise<RankingRecalculateResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

const scope = opts?.scopeFilter ?? options?.scopeFilter;
if (scope !== undefined && !VALID_SCOPES.includes(scope)) {
const err = makeSyntheticError(
'INVALID_PERIOD',
`Invalid scope filter "${scope}". Valid values are: ${VALID_SCOPES.join(', ')}.`,
        );
setError(err);
setJobStatus('failed');
return Promise.reject(err);
      }

const startedAt = Date.now();
setJobStatus('pending');
setError(null);
setIsRunningLocal(true);

addRankingAdminBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'started',
durationMs: 0,
      });

let resolvePromise: (value: RankingRecalculateResponseDto) => void;
let rejectPromise: (reason: unknown) => void;
const promise = new Promise<RankingRecalculateResponseDto>((resolve, reject) => {
resolvePromise = resolve;
rejectPromise = reject;
      });
inFlightRef.current = promise;

recalculateRanking({ periodId: scope })
        .then((result) => {
const durationMs = Date.now() - startedAt;

setJobStatus('completed');
setAudit((prev) => ({ ...prev, after: result }));
setIsRunningLocal(false);

addAdminAuditBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'success',
durationMs,
before: null,
after: result,
          });

invalidate();

resolvePromise(result);
        })
        .catch((err: unknown) => {
const durationMs = Date.now() - startedAt;
const apiError = err as ApiError;

if (apiError.code === 'OPERATION_RUNNING') {

setJobStatus('running');
setError(apiError);
setIsRunningLocal(false);
          } else if (apiError.code === 'OPERATION_COOLDOWN') {

const cooldownSeconds = parseCooldownFrom(
(apiError['data'] as { extensions?: { retryAfter?: string | number } } | undefined)
?.extensions?.retryAfter,
            );
if (cooldownSeconds !== null) {
startCooldownCountdown(cooldownSeconds);
            }
setJobStatus('failed');
setError(apiError);
setIsRunningLocal(false);
          } else {
setJobStatus('failed');
setError(apiError);
setIsRunningLocal(false);
          }

addRankingAdminBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'failure',
durationMs,
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
          });

rejectPromise(apiError);
        })
        .finally(() => {
inFlightRef.current = null;
        });

return promise;
    },
[options?.scopeFilter, invalidate, startCooldownCountdown],
  );

const reset = useCallback(() => {
setJobStatus(null);
setError(null);
clearCooldown();
setAudit({ before: null, after: null });
inFlightRef.current = null;
setIsRunningLocal(false);
  }, [clearCooldown]);

useEffect(() => {
return () => {
if (cooldownIntervalRef.current !== null) {
clearInterval(cooldownIntervalRef.current);
cooldownIntervalRef.current = null;
      }
    };
  }, []);

return {
trigger,
jobStatus,

affectedUserCount: null,
error,
isRunning: isRunningLocal,
cooldownRemaining,
audit,
reset,
  };
}
