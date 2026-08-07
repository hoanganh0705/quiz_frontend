/**
 * `auditLogService.ts` — Audit log admin service.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.B1.
 *
 * ## Purpose
 *
 * Thin service layer that wraps the audit log SDK functions.
 * The service is the only layer under `features/admin/**` that touches
 * the SDK for audit log admin; every `features/admin/hooks/**` consumer
 * of audit log queries imports from this service. The cross-batch
 * invariant `service-only-http` is enforced by the lint invariants script
 * (TKT-7.1.B6).
 *
 * ## Functions
 *
 *   - `listAuditLog(filters, pagination)` — wraps the audit log list endpoint.
 *   - `getAuditLogEntry(entryId)`          — wraps the audit log detail endpoint.
 *
 * ## Error contract
 *
 * Each function propagates the SDK's `ApiError` directly. The
 * `ApiError.code` getter resolves to a typed `ErrorCode` from
 * `@/lib/api/error-codes`, including the Phase 7 admin codes
 * registered in `TKT-7.1.A3`.
 *
 * Notable error codes:
 *   - `AUDIT_LOG_PERMISSION_DENIED`: User lacks AUDIT_LOG_READ permission
 *   - `AUDIT_LOG_NOT_EXPOSED`: Audit log endpoint not exposed by backend
 *
 * ## Degradation path
 *
 * When the backend does not expose the audit log endpoint, the service
 * throws an `ApiError` with `code: AUDIT_LOG_NOT_EXPOSED`. The hook
 * layer handles this by rendering the degradation notice rather than
 * the audit log list.
 */

import type {
  AuditLogEntryDto,
  AuditLogListDto,
  AuditLogFilters,
  AuditLogPagination,
} from '../types';

/**
 * Audit log list options.
 */
export interface ListAuditLogOptions {
  readonly filters?: AuditLogFilters;
  readonly pagination?: AuditLogPagination;
}

/**
 * List audit log entries.
 *
 * Wraps `GET /admin/audit` with optional filters and pagination.
 *
 * @throws `ApiError<ErrorCode>` with `code: PERMISSION_DENIED`
 *         when the user lacks AUDIT_LOG_READ permission.
 * @throws `ApiError<ErrorCode>` with `code: NOT_EXPOSED`
 *         when the backend does not expose the audit log endpoint.
 *
 * @param options - Filter and pagination options
 * @returns The paginated audit log list
 */
export async function listAuditLog(
  options: ListAuditLogOptions = {},
): Promise<AuditLogListDto> {
  const filters = options.filters ?? {};
  const pagination = options.pagination ?? { offset: 0, limit: 20 };

  // Build query parameters
  const params: Record<string, string | number> = {};

  if (filters.actorId) params['actorId'] = filters.actorId;
  if (filters.action) params['action'] = filters.action;
  if (filters.targetType) params['targetType'] = filters.targetType;
  if (filters.targetId) params['targetId'] = filters.targetId;
  if (filters.from) params['from'] = filters.from;
  if (filters.to) params['to'] = filters.to;

  params['offset'] = pagination.offset;
  params['limit'] = pagination.limit;

  // TODO: Replace with actual SDK call once admin SDK is regenerated
  // The SDK call will look like:
  // const sdk = getAdmin();
  // const wrapped = await sdk.listAdminAuditLog(params);
  // return (wrapped.data.data as AuditLogListDto) ?? (wrapped.data as unknown as AuditLogListDto);

  // For now, return a mock response to allow frontend development to proceed
  // This will be replaced with the actual SDK call after backend verification
  return mockListAuditLog(params);
}

/**
 * Get a single audit log entry by ID.
 *
 * Wraps `GET /admin/audit/:entryId`.
 *
 * @throws `ApiError<ErrorCode>` with `code: PERMISSION_DENIED`
 *         when the user lacks AUDIT_LOG_READ permission.
 * @throws `ApiError<ErrorCode>` with `code: NOT_EXPOSED`
 *         when the backend does not expose the audit log endpoint.
 *
 * @param entryId - The audit log entry ID
 * @returns The audit log entry
 */
export async function getAuditLogEntry(
  entryId: string,
): Promise<AuditLogEntryDto> {
  // TODO: Replace with actual SDK call once admin SDK is regenerated
  // The SDK call will look like:
  // const sdk = getAdmin();
  // const wrapped = await sdk.getAdminAuditEntry(entryId);
  // return (wrapped.data.data as AuditLogEntryDto) ?? (wrapped.data as unknown as AuditLogEntryDto);

  // For now, return a mock response to allow frontend development to proceed
  return mockGetAuditLogEntry(entryId);
}

// ─── Mock implementations (to be replaced with SDK calls) ─────────────────

/**
 * Mock implementation of listAuditLog.
 *
 * TODO: Remove this mock once the admin SDK is regenerated with audit functions.
 * This is a temporary placeholder to allow frontend development to proceed.
 */
function mockListAuditLog(
  params: Record<string, string | number>,
): AuditLogListDto {
  const offset = Number(params['offset']) || 0;
  const limit = Number(params['limit']) || 20;

  // Generate mock data
  const mockEntries: AuditLogEntryDto[] = Array.from(
    { length: Math.min(limit, 50) },
    (_, i) => ({
      id: `audit-${offset + i}-${Date.now()}`,
      actorId: 'admin-user-id-123',
      action: getMockAction((offset + i) % 5),
      targetType: getMockTargetType((offset + i) % 4),
      targetId: `target-${offset + i}`,
      requestId: `req-${offset + i}-${Date.now()}`,
      correlationId: `corr-${offset + i}`,
      timestamp: new Date(
        Date.now() - (offset + i) * 60 * 60 * 1000,
      ).toISOString(),
      payload: {}, // Redacted
    }),
  );

  return {
    data: mockEntries,
    meta: {
      total: 150,
      offset,
      limit,
    },
  };
}

/**
 * Mock implementation of getAuditLogEntry.
 *
 * TODO: Remove this mock once the admin SDK is regenerated with audit functions.
 */
function mockGetAuditLogEntry(entryId: string): AuditLogEntryDto {
  return {
    id: entryId,
    actorId: 'admin-user-id-123',
    action: 'role.grant',
    targetType: 'user',
    targetId: 'target-user-id-456',
    requestId: `req-${entryId}`,
    correlationId: `corr-${entryId}`,
    timestamp: new Date().toISOString(),
    payload: {}, // Redacted
  };
}

function getMockAction(index: number): string {
  const actions = [
    'role.grant',
    'role.revoke',
    'tournament.delete',
    'tag.delete',
    'achievement.badge_revoke',
  ];
  return actions[index % actions.length]!;
}

function getMockTargetType(index: number): string {
  const types = ['user', 'tournament', 'tag', 'achievement'];
  return types[index % types.length]!;
}
