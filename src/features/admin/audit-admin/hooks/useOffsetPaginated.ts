/**
 * `useOffsetPaginated.ts` — deprecated shim.
 *
 * TKT-7.5 cleanup, Phase 5 / P1-2: the audit-log offset hook was
 * renamed to `useOffsetPaginatedAuditLogs` to avoid colliding with
 * the Phase-6 `@/lib/api/use-offset-paginated` fetch facade. This
 * file re-exports the new hook under the old name so existing
 * imports keep compiling until callers migrate.
 *
 * @deprecated Import from `./useOffsetPaginatedAuditLogs` instead.
 */

export {
  useOffsetPaginatedAuditLogs as useOffsetPaginated,
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from './useOffsetPaginatedAuditLogs';

export type {
  UseOffsetPaginatedAuditLogsParams as UseOffsetPaginatedParams,
  UseOffsetPaginatedAuditLogsResult as UseOffsetPaginatedResult,
} from './useOffsetPaginatedAuditLogs';