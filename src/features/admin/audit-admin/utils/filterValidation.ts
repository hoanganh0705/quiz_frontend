/**
 * `filterValidation.ts` — Audit log filter validation utilities.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.B2.
 *
 * ## Purpose
 *
 * Validation utilities for audit log filter parameters.
 * Ensures filter values meet the constraints defined by the backend contract.
 */

import type { AuditLogFilters, AuditLogFilterField } from '../audit-admin-types';
import { AUDIT_LOG_FILTER_FIELDS } from '../audit-admin-types';

// ─── UUID validation ─────────────────────────────────────────────────────

/**
 * Regular expression for validating UUID format.
 *
 * Matches UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID.
 *
 * @param value - The string to validate
 * @returns `true` if the string is a valid UUID
 */
export function isValidUuid(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

/**
 * Validate actorId filter value.
 *
 * @param value - The actorId to validate
 * @returns `true` if valid (valid UUID or empty)
 */
export function isValidActorId(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return isValidUuid(value);
}

/**
 * Validate targetId filter value.
 *
 * @param value - The targetId to validate
 * @returns `true` if valid (valid UUID or empty)
 */
export function isValidTargetId(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return isValidUuid(value);
}

// ─── Date validation ────────────────────────────────────────────────────

/**
 * Regular expression for validating ISO 8601 date format.
 *
 * Matches: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.sssZ
 */
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

/**
 * Validate if a string is a valid ISO 8601 date.
 *
 * @param value - The date string to validate
 * @returns `true` if the string is a valid ISO 8601 date
 */
export function isValidIsoDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!ISO_DATE_REGEX.test(value)) return false;

  // Additional check: ensure it's a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate date range: 'from' must be before or equal to 'to'.
 *
 * @param from - Start of range (ISO 8601)
 * @param to - End of range (ISO 8601)
 * @returns `true` if the range is valid
 */
export function isValidDateRange(from?: string, to?: string): boolean {
  // Both undefined is valid
  if (!from && !to) return true;

  // One defined, other not: valid
  if (!from || !to) return true;

  // Both defined: check order
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) return false;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  return fromDate <= toDate;
}

/**
 * Validate 'from' date filter value.
 *
 * @param value - The from date to validate
 * @returns `true` if valid (valid ISO date or empty)
 */
export function isValidFromDate(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return isValidIsoDate(value);
}

/**
 * Validate 'to' date filter value.
 *
 * @param value - The to date to validate
 * @returns `true` if valid (valid ISO date or empty)
 */
export function isValidToDate(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return isValidIsoDate(value);
}

// ─── String validation ───────────────────────────────────────────────────

/**
 * Validate action filter value.
 *
 * Action is a free-form string but should be reasonably short.
 *
 * @param value - The action to validate
 * @returns `true` if valid (non-empty string under max length or empty)
 */
export function isValidAction(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  // Action should be reasonably short (e.g., 'role.grant', 'tournament.delete')
  return value.length > 0 && value.length <= 100;
}

/**
 * Validate targetType filter value.
 *
 * Target type is a free-form string but should be reasonably short.
 *
 * @param value - The target type to validate
 * @returns `true` if valid (non-empty string under max length or empty)
 */
export function isValidTargetType(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  // Target type should be reasonably short (e.g., 'user', 'tournament')
  return value.length > 0 && value.length <= 50;
}

// ─── Filter validation ──────────────────────────────────────────────────

/**
 * Validation error for a specific filter field.
 */
export interface FilterValidationError {
  readonly field: AuditLogFilterField;
  readonly message: string;
}

/**
 * Validate a complete set of audit log filters.
 *
 * @param filters - The filter object to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateAuditLogFilters(
  filters: Partial<AuditLogFilters>,
): FilterValidationError[] {
  const errors: FilterValidationError[] = [];

  // Validate actorId
  if (!isValidActorId(filters.actorId)) {
    errors.push({
      field: 'actorId',
      message: 'Actor ID must be a valid UUID',
    });
  }

  // Validate targetId
  if (!isValidTargetId(filters.targetId)) {
    errors.push({
      field: 'targetId',
      message: 'Target ID must be a valid UUID',
    });
  }

  // Validate action
  if (!isValidAction(filters.action)) {
    errors.push({
      field: 'action',
      message: 'Action must be a non-empty string under 100 characters',
    });
  }

  // Validate targetType
  if (!isValidTargetType(filters.targetType)) {
    errors.push({
      field: 'targetType',
      message: 'Target type must be a non-empty string under 50 characters',
    });
  }

  // Validate from date
  if (!isValidFromDate(filters.from)) {
    errors.push({
      field: 'from',
      message: 'From date must be a valid ISO 8601 date',
    });
  }

  // Validate to date
  if (!isValidToDate(filters.to)) {
    errors.push({
      field: 'to',
      message: 'To date must be a valid ISO 8601 date',
    });
  }

  // Validate date range
  if (!isValidDateRange(filters.from, filters.to)) {
    errors.push({
      field: 'to',
      message: 'End date must be after or equal to start date',
    });
  }

  return errors;
}

/**
 * Check if a filter object is valid.
 *
 * @param filters - The filter object to validate
 * @returns `true` if all filters are valid
 */
export function isValidAuditLogFilters(
  filters: Partial<AuditLogFilters>,
): boolean {
  return validateAuditLogFilters(filters).length === 0;
}

/**
 * Normalize a filter object by removing invalid values.
 *
 * @param filters - The filter object to normalize
 * @returns A normalized filter object with only valid values
 */
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

/**
 * Check if a filter object has any active filters.
 *
 * @param filters - The filter object to check
 * @returns `true` if any filter is set
 */
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

/**
 * Check if two filter objects are equal.
 *
 * @param a - First filter object
 * @param b - Second filter object
 * @returns `true` if the filters are equal
 */
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
