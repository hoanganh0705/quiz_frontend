'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import { addRankingAdminBreadcrumb, addAdminAuditBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
resetRankingPeriod,
type RankingPeriodResetResponseDto,
} from '../../services/ranking-admin.service';
import type { RankingJobStatus } from '../ranking-admin-types';
import { parseCooldownFrom } from '../ranking-admin-types';

import {
invalidateRankingCaches,
} from '../ranking-admin-cache';

export interface UseResetRankingPeriodAudit {

before: null;

after: RankingPeriodResetResponseDto | null;
}

export interface UseResetRankingPeriodResult {

readonly trigger: (options?: {

periodIdentifier?: string;

confirmString?: string;

before?: null;
  }) => Promise<RankingPeriodResetResponseDto>;

readonly jobStatus: RankingJobStatus | null;

readonly affectedUserCount: number | null;

readonly error: ApiError | null;

readonly isRunning: boolean;

readonly cooldownRemaining: number | null;

readonly showCrossUserWarning: boolean;

readonly validatePeriod: (period: string) => { valid: boolean; error?: string };

readonly audit: UseResetRankingPeriodAudit;

readonly reset: () => void;
}

const RANKING_ACTION = 'ranking.reset';
const RANKING_ROUTE = 'rankings.reset';

const VALID_PERIODS: readonly string[] = ['current', 'last', 'all'];

function makeSyntheticError(code: string, message: string): ApiError {
return ApiError.fromInput({
status: 400,
code,
message,
title: code,
  });
}

export function useResetRankingPeriod(
options?: { periodIdentifier?: string },
): UseResetRankingPeriodResult {
const [jobStatus, setJobStatus] = useState<RankingJobStatus | null>(null);
const [error, setError] = useState<ApiError | null>(null);
const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
const [audit, setAudit] = useState<UseResetRankingPeriodAudit>({
before: null,
after: null,
  });

const [isRunningLocal, setIsRunningLocal] = useState(false);

const inFlightRef = useRef<Promise<RankingPeriodResetResponseDto> | null>(null);

const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

const validatePeriod = useCallback(
(period: string): { valid: boolean; error?: string } => {
if (VALID_PERIODS.includes(period)) {
return { valid: true };
      }
return {
valid: false,
error: `Invalid period identifier "${period}". Valid values are: ${VALID_PERIODS.join(', ')}.`,
      };
    },
[],
  );

const trigger = useCallback(
async (
opts?: {
periodIdentifier?: string;
confirmString?: string;
before?: null;
      },
    ): Promise<RankingPeriodResetResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

const period = opts?.periodIdentifier ?? options?.periodIdentifier;
if (period !== undefined && !VALID_PERIODS.includes(period)) {
const err = makeSyntheticError(
'INVALID_PERIOD',
`Invalid period identifier "${period}". Valid values are: ${VALID_PERIODS.join(', ')}.`,
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

let resolvePromise: (value: RankingPeriodResetResponseDto) => void;
let rejectPromise: (reason: unknown) => void;
const promise = new Promise<RankingPeriodResetResponseDto>((resolve, reject) => {
resolvePromise = resolve;
rejectPromise = reject;
      });
inFlightRef.current = promise;

resetRankingPeriod({
periodId: period ?? 'current',
confirmString: opts?.confirmString ?? '',
      })
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
[options?.periodIdentifier, invalidate, startCooldownCountdown],
  );

const currentPeriod = options?.periodIdentifier;
const showCrossUserWarning =
currentPeriod !== undefined && VALID_PERIODS.includes(currentPeriod);

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
showCrossUserWarning,
validatePeriod,
audit,
reset,
  };
}
