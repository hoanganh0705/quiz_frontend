

import type { AuditLogFilters, AuditLogFilterField } from '../audit-admin-types';
import { AUDIT_LOG_FILTER_FIELDS } from '../audit-admin-types';

const UUID_REGEX =
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
if (!value || typeof value !== 'string') return false;
return UUID_REGEX.test(value);
}

export function isValidActorId(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;
return isValidUuid(value);
}

export function isValidTargetId(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;
return isValidUuid(value);
}

const ISO_DATE_REGEX =
/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

export function isValidIsoDate(value: string): boolean {
if (!value || typeof value !== 'string') return false;
if (!ISO_DATE_REGEX.test(value)) return false;

const date = new Date(value);
return !isNaN(date.getTime());
}

export function isValidDateRange(from?: string, to?: string): boolean {

if (!from && !to) return true;

if (!from || !to) return true;

if (!isValidIsoDate(from) || !isValidIsoDate(to)) return false;

const fromDate = new Date(from);
const toDate = new Date(to);

return fromDate <= toDate;
}

export function isValidFromDate(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;
return isValidIsoDate(value);
}

export function isValidToDate(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;
return isValidIsoDate(value);
}

export function isValidAction(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;

return value.length > 0 && value.length <= 100;
}

export function isValidTargetType(value: unknown): boolean {
if (value === undefined || value === null || value === '') return true;
if (typeof value !== 'string') return false;

return value.length > 0 && value.length <= 50;
}

export interface FilterValidationError {
readonly field: AuditLogFilterField;
readonly message: string;
}

export function validateAuditLogFilters(
filters: Partial<AuditLogFilters>,
): FilterValidationError[] {
const errors: FilterValidationError[] = [];

if (!isValidActorId(filters.actorId)) {
errors.push({
field: 'actorId',
message: 'Actor ID must be a valid UUID',
    });
  }

if (!isValidTargetId(filters.targetId)) {
errors.push({
field: 'targetId',
message: 'Target ID must be a valid UUID',
    });
  }

if (!isValidAction(filters.action)) {
errors.push({
field: 'action',
message: 'Action must be a non-empty string under 100 characters',
    });
  }

if (!isValidTargetType(filters.targetType)) {
errors.push({
field: 'targetType',
message: 'Target type must be a non-empty string under 50 characters',
    });
  }

if (!isValidFromDate(filters.from)) {
errors.push({
field: 'from',
message: 'From date must be a valid ISO 8601 date',
    });
  }

if (!isValidToDate(filters.to)) {
errors.push({
field: 'to',
message: 'To date must be a valid ISO 8601 date',
    });
  }

if (!isValidDateRange(filters.from, filters.to)) {
errors.push({
field: 'to',
message: 'End date must be after or equal to start date',
    });
  }

return errors;
}

export function isValidAuditLogFilters(
filters: Partial<AuditLogFilters>,
): boolean {
return validateAuditLogFilters(filters).length === 0;
}

export function normalizeAuditLogFilters(
filters: Partial<AuditLogFilters>,
): AuditLogFilters {
const normalized: AuditLogFilters = {};

if (filters.actorId && isValidActorId(filters.actorId)) {
(normalized as Record<string, unknown>).actorId = filters.actorId;
  }
if (filters.targetId && isValidTargetId(filters.targetId)) {
(normalized as Record<string, unknown>).targetId = filters.targetId;
  }
if (filters.action && isValidAction(filters.action)) {
(normalized as Record<string, unknown>).action = filters.action;
  }
if (filters.targetType && isValidTargetType(filters.targetType)) {
(normalized as Record<string, unknown>).targetType = filters.targetType;
  }
if (filters.from && isValidFromDate(filters.from)) {
(normalized as Record<string, unknown>).from = filters.from;
  }
if (filters.to && isValidToDate(filters.to)) {
(normalized as Record<string, unknown>).to = filters.to;
  }

return normalized;
}

export function hasActiveFilters(filters: Partial<AuditLogFilters>): boolean {
return !!(
filters.actorId ||
filters.targetId ||
filters.action ||
filters.targetType ||
filters.from ||
filters.to
  );
}

export function areFiltersEqual(
a: Partial<AuditLogFilters>,
b: Partial<AuditLogFilters>,
): boolean {
return (
a.actorId === b.actorId &&
a.targetId === b.targetId &&
a.action === b.action &&
a.targetType === b.targetType &&
a.from === b.from &&
a.to === b.to
  );
}
