

export type {
RankingRecalculateRequestDto,
RankingRecalculateResponseDto,
RankingPeriodResetRequestDto,
RankingPeriodResetResponseDto,
RankingConsistencyCheckResponseDto,
} from '../services/ranking-admin.service';

export type RankingJobStatus =
| 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface RankingJobState {
jobId: string;
status: RankingJobStatus;
startedAt: string;
completedAt?: string;
error?: string;
}

export interface NormalisedRecalculateResponse {
jobId: string;
status: RankingJobStatus;
startedAt: string;
completedAt?: string;

affectedUserCount: null;
}

export interface NormalisedResetResponse {
periodId: string;
resetAt: string;
affectedUserCount: number;
}

export type RankingConsistencyStatus = 'ok' | 'warning' | 'error';

export type RankingConsistencySeverity = 'low' | 'medium' | 'high';

export interface NormalisedConsistencyResponse {
status: RankingConsistencyStatus;
severity: RankingConsistencySeverity;
issueCount: number;
primaryIssue?: string;
checkedAt: string;

inconsistencies: RankingInconsistencyDto[];
}

export interface RankingInconsistencyDto {

userId: string;

field: string;

expected: string | number;

actual: string | number;

period: string;
}

export type RankingAdminErrorCode =
| 'OPERATION_RUNNING'
  | 'OPERATION_COOLDOWN'
  | 'INVALID_PERIOD'
  | 'IRREVERSIBLE_CONFIRM_REQUIRED'
  | 'PERMISSION_DENIED';

export const RANKING_SCOPE_VALUES = ['current_period', 'last_period', 'all'] as const;

export type RankingScopeValue = (typeof RANKING_SCOPE_VALUES)[number];

export function parseCooldownFrom(
value: string | number | undefined,
): number | null {
if (value === undefined || value === null) {
return null;
  }

if (typeof value === 'number') {

if (value < 3600) {
return value;
    }

const msRemaining = value - Date.now();
return msRemaining > 0 ? Math.ceil(msRemaining / 1000) : 0;
  }

if (typeof value === 'string') {
const parsed = Date.parse(value);
if (!isNaN(parsed)) {

const msRemaining = parsed - Date.now();
return msRemaining > 0 ? Math.ceil(msRemaining / 1000) : 0;
    }
  }

return null;
}
