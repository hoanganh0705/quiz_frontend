

import { orvalCustomInstance } from '@/lib/api/core/custom-instance';

export interface RankingRecalculateRequestDto {

periodId?: string;

includeArchived?: boolean;
}

export interface RankingRecalculateResponseDto {
jobId: string;
status: 'queued' | 'running' | 'completed' | 'failed';
startedAt: string;
estimatedDurationMs?: number;
}

export interface RankingPeriodResetRequestDto {
periodId: string;

confirmString: string;
}

export interface RankingPeriodResetResponseDto {
periodId: string;
resetAt: string;
affectedUsers: number;
}

export interface RankingConsistencyCheckResponseDto {

status: 'ok' | 'warning' | 'error';

severity: 'low' | 'medium' | 'high';

issueCount: number;

primaryIssue?: string;

checkedAt: string;
}

export async function recalculateRanking(
input: RankingRecalculateRequestDto = {},
): Promise<RankingRecalculateResponseDto> {
const wire = await orvalCustomInstance<{ data: RankingRecalculateResponseDto }>({
url: '/api/v1/admin/ranking/recalculate',
method: 'POST',
headers: { 'Content-Type': 'application/json' },
data: input,
  });
return (wire as { data: RankingRecalculateResponseDto }).data;
}

export async function resetRankingPeriod(
input: RankingPeriodResetRequestDto,
): Promise<RankingPeriodResetResponseDto> {
const wire = await orvalCustomInstance<{ data: RankingPeriodResetResponseDto }>({
url: '/api/v1/admin/ranking/reset',
method: 'POST',
headers: { 'Content-Type': 'application/json' },
data: input,
  });
return (wire as { data: RankingPeriodResetResponseDto }).data;
}

export async function checkRankingConsistency(): Promise<RankingConsistencyCheckResponseDto> {
const wire = await orvalCustomInstance<{ data: RankingConsistencyCheckResponseDto }>({
url: '/api/v1/admin/ranking/consistency-check',
method: 'GET',
  });
return (wire as { data: RankingConsistencyCheckResponseDto }).data;
}
