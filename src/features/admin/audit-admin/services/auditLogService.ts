import { ApiError } from "@/lib/api";
import { orvalCustomInstance } from "@/lib/api/core/custom-instance";

import type {
  AuditLogEntryDto,
  AuditLogFilters,
  AuditLogListDto,
  AuditLogPagination,
} from "../types";

export interface ListAuditLogOptions {
  readonly filters?: AuditLogFilters;
  readonly pagination?: AuditLogPagination;
}

interface RawAdminAuditRow {
  readonly auditLogId?: string;
  readonly id?: string;
  readonly userId?: string | null;
  readonly eventType?: string;
  readonly domain?: string | null;
  readonly action?: string | null;
  readonly actorId?: string | null;
  readonly subjectUserId?: string | null;
  readonly ipAddress?: string | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt?: string;
}

interface RawAuditSearchResponse {
  readonly data?: readonly RawAdminAuditRow[];
  readonly meta?: {
    readonly total?: number;
    readonly page?: number;
    readonly limit?: number;
    readonly pagination?: {
      readonly total?: number;
      readonly page?: number;
      readonly limit?: number;
      readonly hasMore?: boolean;
    };
  };
}

function mapAuditRowToEntry(row: RawAdminAuditRow): AuditLogEntryDto {
  const id = String(row.auditLogId ?? row.id ?? "");
  const metadata =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const requestId =
    typeof metadata.requestId === "string" && metadata.requestId.length > 0
      ? metadata.requestId
      : id;
  const correlationId =
    typeof metadata.correlationId === "string"
      ? metadata.correlationId
      : undefined;

  return {
    id,
    actorId: row.actorId ?? "system",
    action: row.action ?? row.eventType ?? "unknown",
    targetType: row.domain ?? "system",
    targetId: row.subjectUserId ?? row.userId ?? "",
    requestId,
    correlationId,
    timestamp: row.createdAt ?? new Date(0).toISOString(),
    payload: metadata,
  };
}

export async function listAuditLog(
  options: ListAuditLogOptions = {},
): Promise<AuditLogListDto> {
  const filters = options.filters ?? {};
  const pagination = options.pagination ?? { offset: 0, limit: 20 };
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = Math.max(0, pagination.offset || 0);
  const page = Math.floor(offset / limit) + 1;

  const params: Record<string, string | number> = {
    page,
    limit,
  };

  if (filters.actorId) params["actorId"] = filters.actorId;
  if (filters.action) params["action"] = filters.action;
  if (filters.targetType) params["domain"] = filters.targetType;
  if (filters.targetId) params["userId"] = filters.targetId;
  if (filters.from) params["from"] = filters.from;
  if (filters.to) params["to"] = filters.to;

  try {
    const response = await orvalCustomInstance<RawAuditSearchResponse>({
      url: "/api/v1/admin/audit/search",
      method: "GET",
      params,
    });

    const rows = Array.isArray(response?.data) ? response.data : [];
    const total = Number(
      response?.meta?.pagination?.total ??
        response?.meta?.total ??
        rows.length,
    );

    return {
      data: rows.map(mapAuditRowToEntry),
      meta: {
        total,
        offset,
        limit,
      },
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      throw ApiError.fromInput({
        status: err.status,
        code: "AUDIT_LOG_NOT_EXPOSED",
        title: "Audit Log Unavailable",
        message: "The audit log search endpoint is not exposed by this backend.",
      });
    }
    throw err;
  }
}

export async function getAuditLogEntry(
  entryId: string,
): Promise<AuditLogEntryDto> {
  const result = await listAuditLog({
    pagination: { offset: 0, limit: 50 },
  });
  const match = result.data.find((entry) => entry.id === entryId);
  if (!match) {
    throw ApiError.fromInput({
      status: 404,
      code: "AUDIT_LOG_NOT_FOUND",
      title: "Audit Log Entry Not Found",
      message: `Audit entry ${entryId} was not found.`,
    });
  }
  return match;
}
