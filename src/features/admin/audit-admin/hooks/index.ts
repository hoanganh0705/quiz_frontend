/**
 * `index.ts` — Audit log admin hooks barrel.
 */

export { useAdminAuditLog } from './useAdminAuditLog';
export type { UseAdminAuditLogResult } from './useAdminAuditLog';

export { useAdminAuditLogEntry } from './useAdminAuditLogEntry';
export type { UseAdminAuditLogEntryResult } from './useAdminAuditLogEntry';

export { useAuditLogFilters } from './useAuditLogFilters';
export type { UseAuditLogFiltersResult } from './useAuditLogFilters';

export { useOffsetPaginated } from './useOffsetPaginated';
export type {
  UseOffsetPaginatedParams,
  UseOffsetPaginatedResult,
} from './useOffsetPaginated';
export {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from './useOffsetPaginated';