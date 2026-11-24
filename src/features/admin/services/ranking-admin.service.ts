import { orvalCustomInstance } from "@/lib/api/core/custom-instance";

export interface RankingRecalculateRequestDto {
  periodId?: string;

  includeArchived?: boolean;
}

export interface RankingRecalculateResponseDto {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
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

export interface ConsistencyReportIssueDto {
  type: string;
  userId?: string | null;
  description: string;
  severity: string;
}

export interface RankingConsistencyCheckResponseDto {
  totalIssues?: number;
  fixed?: number;
  issues?: ConsistencyReportIssueDto[];

  status?: "ok" | "warning" | "error";
  severity?: "low" | "medium" | "high";
  issueCount?: number;
  primaryIssue?: string;
  checkedAt?: string;
}

/**
 * Triggers ranking recalculation.
 * @throws {ApiError} OPERATION_RUNNING
 * @throws {ApiError} OPERATION_COOLDOWN
 */
export async function recalculateRanking(
  input: RankingRecalculateRequestDto = {},
): Promise<RankingRecalculateResponseDto> {
  const wire = await orvalCustomInstance<{
    data: RankingRecalculateResponseDto;
  }>({
    url: "/api/v1/admin/ranking/recalculate",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: input,
  });
  return (wire as { data: RankingRecalculateResponseDto }).data;
}

/**
 * Resets a ranking period.
 * @throws {ApiError} IRREVERSIBLE_CONFIRM_REQUIRED
 */
export async function resetRankingPeriod(
  input: RankingPeriodResetRequestDto,
): Promise<RankingPeriodResetResponseDto> {
  const wire = await orvalCustomInstance<{
    data: RankingPeriodResetResponseDto;
  }>({
    url: "/api/v1/admin/ranking/reset",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: input,
  });
  return (wire as { data: RankingPeriodResetResponseDto }).data;
}

export async function checkRankingConsistency(): Promise<RankingConsistencyCheckResponseDto> {
  const wire = await orvalCustomInstance<{
    data?: RankingConsistencyCheckResponseDto;
  }>({
    url: "/api/v1/admin/ranking/consistency-check",
    method: "POST",
  });
  const raw = wire as
    | { data?: RankingConsistencyCheckResponseDto }
    | RankingConsistencyCheckResponseDto;
  const data =
    "data" in raw && raw.data ? raw.data : (raw as RankingConsistencyCheckResponseDto);

  const total = data.totalIssues ?? data.issueCount ?? 0;
  return {
    ...data,
    totalIssues: total,
    issueCount: total,
    fixed: data.fixed ?? 0,
    issues: data.issues ?? [],
    status: total === 0 ? "ok" : "warning",
    severity: (data.issues?.[0]?.severity as "low" | "medium" | "high") ?? "low",
    checkedAt: data.checkedAt ?? new Date().toISOString(),
  };
}
