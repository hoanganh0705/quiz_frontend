'use client';

import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { addRankingAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
checkRankingConsistency,
type RankingConsistencyCheckResponseDto,
} from '../../services/ranking-admin.service';
import type { RankingInconsistencyDto } from '../ranking-admin-types';

export interface UseCheckRankingConsistencyAudit {

before: RankingConsistencyCheckResponseDto | null;

after: RankingConsistencyCheckResponseDto | null;
}

export interface UseCheckRankingConsistencyResult {

readonly trigger: () => Promise<RankingConsistencyCheckResponseDto>;

readonly inconsistencies: RankingInconsistencyDto[];

readonly totalCount: number | null;

readonly checkedAt: Date | null;

readonly error: ApiError | null;

readonly isRunning: boolean;

readonly isPartialResult: boolean;

readonly audit: UseCheckRankingConsistencyAudit;

readonly reset: () => void;
}

const RANKING_ACTION = 'ranking.consistencyCheck';
const RANKING_ROUTE = 'rankings.consistencyCheck';

export function useCheckRankingConsistency(): UseCheckRankingConsistencyResult {
const [inconsistencies, setInconsistencies] = useState<RankingInconsistencyDto[]>([]);
const [totalCount, setTotalCount] = useState<number | null>(null);
const [checkedAt, setCheckedAt] = useState<Date | null>(null);
const [error, setError] = useState<ApiError | null>(null);
const [isRunning, setIsRunning] = useState(false);
const [isPartialResult, setIsPartialResult] = useState(false);
const [audit, setAudit] = useState<UseCheckRankingConsistencyAudit>({
before: null,
after: null,
  });

const inFlightRef = useRef<Promise<RankingConsistencyCheckResponseDto> | null>(null);

const trigger = useCallback((): Promise<RankingConsistencyCheckResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
    }

const startedAt = Date.now();
setIsRunning(true);
setError(null);

addRankingAdminBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'started',
durationMs: 0,
      });

const promise = checkRankingConsistency()
      .then((result) => {
const durationMs = Date.now() - startedAt;

addRankingAdminBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'success',
durationMs,
          });

setAudit((prev) => ({ ...prev, after: result }));
setCheckedAt(new Date());

setInconsistencies([]);
setTotalCount(result.issueCount ?? null);

const hasIssues = (result.issueCount ?? 0) > 0;
const hasInconsistencyList = false;
setIsPartialResult(hasIssues && !hasInconsistencyList);

setIsRunning(false);

return result;
      })
      .catch((err: ApiError) => {
const durationMs = Date.now() - startedAt;
const apiError = err as ApiError;

setError(apiError);
setIsRunning(false);

addRankingAdminBreadcrumb({
action: RANKING_ACTION,
route: RANKING_ROUTE,
status: 'failure',
durationMs,
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
        });

return Promise.reject(apiError);
      })
      .finally(() => {
inFlightRef.current = null;
      });

inFlightRef.current = promise;
return promise;
  }, []);

const reset = useCallback(() => {
setInconsistencies([]);
setTotalCount(null);
setCheckedAt(null);
setError(null);
setIsRunning(false);
setIsPartialResult(false);
setAudit({ before: null, after: null });
inFlightRef.current = null;
  }, []);

return {
trigger,
inconsistencies,
totalCount,
checkedAt,
error,
isRunning,
isPartialResult,
audit,
reset,
  };
}
