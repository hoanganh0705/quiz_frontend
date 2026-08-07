/**
 * `index.ts` — Audit log admin service barrel.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.B1.
 */

export {
  listAuditLog,
  getAuditLogEntry,
} from './auditLogService';

export type {
  ListAuditLogOptions,
} from './auditLogService';

export type {
  AuditLogEntryDto,
  AuditLogListDto,
  AuditLogDetailDto,
  AuditLogFilters,
  AuditLogPagination,
} from '../audit-admin-types';
