/**
 * `index.ts` — Audit log admin feature barrel.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.B1, TKT-7.11.C1, TKT-7.11.C2, TKT-7.11.C3, TKT-7.11.C4,
 *                 TKT-7.11.D1, TKT-7.11.E1, TKT-7.11.F1.
 *
 * ## Feature overview
 *
 * The audit log admin surface provides read-only access to the admin
 * audit log. It has two paths:
 *
 * 1. **Exposed path**: When the backend exposes `GET /admin/audit`,
 *    the admin can browse the audit history with filters and pagination.
 * 2. **Degradation path**: When the backend does not expose the endpoint,
 *    `AuditLogNotExposedNotice` is rendered.
 *
 * ## What this module exports
 *
 * - Types: `AuditLogEntryDto`, `AuditLogListDto`, `AuditLogFilters`, etc.
 * - Service: `listAuditLog`, `getAuditLogEntry`
 * - Hooks: `useAdminAuditLog`, `useAdminAuditLogEntry`, `useAuditLogFilters`,
 *          `useOffsetPaginated`
 * - Components: `AuditLogPage`, `AuditLogList`, `AuditLogItem`,
 *               `AuditLogNotExposedNotice`, etc.
 * - Metadata: `AUDIT_LOG_METADATA` (route + nav metadata)
 * - Utils: Filter validation utilities
 *
 * ## Feature flag
 *
 * This feature is gated by `phase7_admin_audit`. When the flag is
 * set to `placeholder`, the hooks and pages return safe fallback data.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export * from './types';

// ─── Service ─────────────────────────────────────────────────────────────

export { listAuditLog, getAuditLogEntry } from './services';
export type { ListAuditLogOptions } from './services';

// ─── Hooks ───────────────────────────────────────────────────────────────

export { useAdminAuditLog } from './hooks';
export type { UseAdminAuditLogResult } from './hooks';

export { useAdminAuditLogEntry } from './hooks';
export type { UseAdminAuditLogEntryResult } from './hooks';

export { useAuditLogFilters } from './hooks';
export type { UseAuditLogFiltersResult } from './hooks';

// TKT-7.5 cleanup, Phase 5 / P1-2: the audit-log offset hook is now
// `useOffsetPaginatedAuditLogs` to avoid colliding with the Phase-6
// `@/lib/api/use-offset-paginated` fetch facade. The old name is
// kept as a deprecated re-export for one release.
export {
  useOffsetPaginatedAuditLogs,
  useOffsetPaginated,
} from './hooks';
export type {
  UseOffsetPaginatedAuditLogsParams,
  UseOffsetPaginatedAuditLogsResult,
  UseOffsetPaginatedParams,
  UseOffsetPaginatedResult,
} from './hooks';
export {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from './hooks';

// ─── Components ──────────────────────────────────────────────────────────

export {
  AuditLogPage,
  AuditLogList,
  AuditLogItem,
  AuditLogFilters,
  AuditLogDetailPanel,
  AuditLogSkeleton,
  AuditLogEmptyState,
  AuditLogErrorState,
  AuditLogExportButton,
  AuditLogNotExposedNotice,
} from './components';
export type {
  AuditLogListProps,
  AuditLogItemProps,
  AuditLogFiltersProps,
  AuditLogDetailPanelProps,
  AuditLogSkeletonProps,
  AuditLogEmptyStateProps,
  AuditLogErrorStateProps,
  AuditLogExportButtonProps,
} from './components';

// ─── Metadata ───────────────────────────────────────────────────────────

export {
  AUDIT_LOG_METADATA,
  AUDIT_LOG_ROUTE_PATH,
} from './metadata';

// ─── Utils ──────────────────────────────────────────────────────────────

export * from './utils';