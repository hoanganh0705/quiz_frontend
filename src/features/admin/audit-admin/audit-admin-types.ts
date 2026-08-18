

export type {
OffsetPaginationMetaDto,
} from '@/lib/api/generated/schemas';

export interface AuditLogEntryDto {
readonly id: string;
readonly actorId: string;
readonly action: string;
readonly targetType: string;
readonly targetId: string;
readonly requestId: string;
readonly correlationId?: string;
readonly timestamp: string;

readonly payload?: Record<string, unknown>;
}

export interface AuditLogListDto {
readonly data: readonly AuditLogEntryDto[];
readonly meta: {
readonly total: number;
readonly offset: number;
readonly limit: number;
  };
}

export interface AuditLogDetailDto {
readonly data: AuditLogEntryDto;
}

export interface AuditLogFilters {

readonly actorId?: string;

readonly action?: string;

readonly targetType?: string;

readonly targetId?: string;

readonly from?: string;

readonly to?: string;
}

export const DEFAULT_AUDIT_LOG_FILTERS: AuditLogFilters = Object.freeze({});

export const AUDIT_LOG_FILTER_FIELDS = [
'actorId',
'action',
'targetType',
'targetId',
'from',
'to',
] as const;

export type AuditLogFilterField = typeof AUDIT_LOG_FILTER_FIELDS[number];

export interface AuditLogPagination {
readonly offset: number;
readonly limit: number;
}

export const DEFAULT_AUDIT_LOG_PAGINATION: AuditLogPagination = Object.freeze({
offset: 0,
limit: 20,
});

export const AUDIT_LOG_MAX_LIMIT = 100;

export type AuditLogState =
| { readonly state: 'exposed' }
  | { readonly state: 'not_exposed' }
  | { readonly state: 'unknown' };

export const AUDIT_LOG_STATE_EXPOSED: AuditLogState = {
state: 'exposed',
};

export const AUDIT_LOG_STATE_NOT_EXPOSED: AuditLogState = {
state: 'not_exposed',
};

export const AUDIT_LOG_STATE_UNKNOWN: AuditLogState = {
state: 'unknown',
};

export type AuditLogErrorCode =

| 'AUDIT_LOG_PERMISSION_DENIED'
  /** Audit log endpoint is not exposed by backend */
  | 'AUDIT_LOG_NOT_EXPOSED';

export const AUDIT_LOG_ERROR_MESSAGES: Readonly<
Record<AuditLogErrorCode, string>
> = Object.freeze({
AUDIT_LOG_PERMISSION_DENIED:
'You do not have permission to view audit logs.',
AUDIT_LOG_NOT_EXPOSED:
'Audit log endpoint is not exposed by the backend.',
});

export function isAuditLogExposed(state: AuditLogState): boolean {
return state.state === 'exposed';
}

export function isAuditLogNotExposed(state: AuditLogState): boolean {
return state.state === 'not_exposed';
}
