/**
 * `audit-admin-types.ts`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.B1 (part of Batch B).
 *
 * ## What this module owns
 *
 * The local type surface for the audit log admin surface — DTO shapes,
 * filter types, and the degraded-state discriminated union.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from `auditLogService.ts` (TKT-7.11.B1). Components consume
 * types exclusively through this module so the DTO boundary is a
 * single-edit point.
 *
 * ## Backend verification (TKT-7.11.A1)
 *
 * This module uses the expected DTO shapes documented in
 * `docs/AUDIT_ENDPOINT_CONTRACT.md`. The exact shapes will be confirmed
 * when the backend team signs off on the verification status document.
 * If the backend does not expose the audit endpoint, the
 * `AuditLogState` discriminated union will reflect the degraded path.
 */

// ─── Re-export Phase 5 pagination types ──────────────────────────────────

export type {
  OffsetPaginationMetaDto,
} from '@/lib/api/generated/schemas';

// ─── Audit log entry DTO ─────────────────────────────────────────────────

/**
 * The audit log entry DTO returned by `GET /admin/audit`.
 *
 * All fields are provided by the backend. The `payload` field is
 * redacted server-side — the frontend must not attempt to render
 * sensitive data from it.
 *
 * @see docs/AUDIT_ENDPOINT_CONTRACT.md
 */
export interface AuditLogEntryDto {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly requestId: string;
  readonly correlationId?: string;
  readonly timestamp: string; // ISO 8601
  /** Redacted server-side — do not render raw payload data */
  readonly payload?: Record<string, unknown>;
}

// ─── Audit log list DTO ──────────────────────────────────────────────────

/**
 * The paginated audit log list DTO returned by `GET /admin/audit`.
 *
 * @see docs/AUDIT_ENDPOINT_CONTRACT.md
 */
export interface AuditLogListDto {
  readonly data: readonly AuditLogEntryDto[];
  readonly meta: {
    readonly total: number;
    readonly offset: number;
    readonly limit: number;
  };
}

// ─── Audit log detail DTO ────────────────────────────────────────────────

/**
 * The single-entry audit log DTO returned by `GET /admin/audit/:entryId`.
 *
 * @see docs/AUDIT_ENDPOINT_CONTRACT.md
 */
export interface AuditLogDetailDto {
  readonly data: AuditLogEntryDto;
}

// ─── Filter types ────────────────────────────────────────────────────────

/**
 * Audit log filter values.
 *
 * All fields are optional. Empty filters return all entries.
 */
export interface AuditLogFilters {
  /** Filter by actor's user ID */
  readonly actorId?: string;
  /** Filter by action type (e.g., 'role.grant', 'tournament.delete') */
  readonly action?: string;
  /** Filter by target entity type */
  readonly targetType?: string;
  /** Filter by target entity ID */
  readonly targetId?: string;
  /** Start of date range (ISO 8601) */
  readonly from?: string;
  /** End of date range (ISO 8601) */
  readonly to?: string;
}

/**
 * Default/empty filter values.
 *
 * Used to reset filters and for initial state.
 */
export const DEFAULT_AUDIT_LOG_FILTERS: AuditLogFilters = Object.freeze({});

/**
 * Union of valid filter field names.
 *
 * Useful for iterating over filter keys and validating
 * incoming filter parameters.
 */
export const AUDIT_LOG_FILTER_FIELDS = [
  'actorId',
  'action',
  'targetType',
  'targetId',
  'from',
  'to',
] as const;

export type AuditLogFilterField = typeof AUDIT_LOG_FILTER_FIELDS[number];

// ─── Pagination types ────────────────────────────────────────────────────

/**
 * Pagination parameters for audit log listing.
 */
export interface AuditLogPagination {
  readonly offset: number;
  readonly limit: number;
}

/**
 * Default pagination values.
 */
export const DEFAULT_AUDIT_LOG_PAGINATION: AuditLogPagination = Object.freeze({
  offset: 0,
  limit: 20,
});

/**
 * Maximum allowed page size.
 */
export const AUDIT_LOG_MAX_LIMIT = 100;

// ─── Degraded state types ────────────────────────────────────────────────

/**
 * Discriminated union representing the possible states of the audit log surface.
 *
 * - `'exposed'`: Backend has exposed the audit log endpoint
 * - `'not_exposed'`: Backend has not exposed the audit log endpoint
 * - `'unknown'`: Backend verification not yet complete
 */
export type AuditLogState =
  | { readonly state: 'exposed' }
  | { readonly state: 'not_exposed' }
  | { readonly state: 'unknown' };

/**
 * State when audit log endpoint is exposed.
 */
export const AUDIT_LOG_STATE_EXPOSED: AuditLogState = {
  state: 'exposed',
};

/**
 * State when audit log endpoint is not exposed.
 */
export const AUDIT_LOG_STATE_NOT_EXPOSED: AuditLogState = {
  state: 'not_exposed',
};

/**
 * State when backend verification is not yet complete.
 */
export const AUDIT_LOG_STATE_UNKNOWN: AuditLogState = {
  state: 'unknown',
};

// ─── Error codes ─────────────────────────────────────────────────────────

/**
 * Error codes specific to the audit log surface.
 *
 * These extend the global `ErrorCode` union.
 * The codes will be added to `lib/api/error-codes.ts` once
 * the backend team confirms their existence.
 */
export type AuditLogErrorCode =
  /** User lacks AUDIT_LOG_READ permission */
  | 'AUDIT_LOG_PERMISSION_DENIED'
  /** Audit log endpoint is not exposed by backend */
  | 'AUDIT_LOG_NOT_EXPOSED';

/**
 * Map of audit-specific error codes to user-friendly messages.
 *
 * These will be integrated into `lib/api/error-codes.ts` once
 * the backend verification is complete.
 */
export const AUDIT_LOG_ERROR_MESSAGES: Readonly<
  Record<AuditLogErrorCode, string>
> = Object.freeze({
  AUDIT_LOG_PERMISSION_DENIED:
    'You do not have permission to view audit logs.',
  AUDIT_LOG_NOT_EXPOSED:
    'Audit log endpoint is not exposed by the backend.',
});

// ─── Exhaustive helper ───────────────────────────────────────────────────

/**
 * Check if the audit log state is 'exposed'.
 */
export function isAuditLogExposed(state: AuditLogState): boolean {
  return state.state === 'exposed';
}

/**
 * Check if the audit log state is 'not_exposed'.
 */
export function isAuditLogNotExposed(state: AuditLogState): boolean {
  return state.state === 'not_exposed';
}
