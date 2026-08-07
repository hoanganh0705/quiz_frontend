/**
 * `index.ts` — Audit log admin hooks barrel.
 */

export { useAdminAuditLog } from './useAdminAuditLog';
export type { UseAdminAuditLogResult } from './useAdminAuditLog';

export { useAdminAuditLogEntry } from './useAdminAuditLogEntry';
export type { UseAdminAuditLogEntryResult } from './useAdminAuditLogEntry';

export { useAuditLogFilters } from './useAuditLogFilters';
export type { UseAuditLogFiltersResult } from './useAuditLogFilters';

// TKT-7.5 cleanup, Phase 5 / P1-2: the audit-log offset hook is now
// `useOffsetPaginatedAuditLogs` to avoid colliding with the Phase-6
// `@/lib/api/use-offset-paginated` fetch facade. The old name is
// kept as a deprecated re-export so existing callers keep compiling
// until they migrate.
export {
  useOffsetPaginatedAuditLogs,
  useOffsetPaginated,
} from './useOffsetPaginatedAuditLogs';
export type {
  UseOffsetPaginatedAuditLogsParams,
  UseOffsetPaginatedAuditLogsResult,
  UseOffsetPaginatedParams,
  UseOffsetPaginatedResult,
} from './useOffsetPaginatedAuditLogs';
export {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from './useOffsetPaginatedAuditLogs';