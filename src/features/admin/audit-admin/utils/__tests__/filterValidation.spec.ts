

import { describe, expect, it } from 'vitest';

import {
isValidUuid,
isValidIsoDate,
isValidDateRange,
isValidActorId,
isValidTargetId,
isValidAction,
isValidTargetType,
validateAuditLogFilters,
isValidAuditLogFilters,
normalizeAuditLogFilters,
hasActiveFilters,
areFiltersEqual,
} from '../filterValidation';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';
const INVALID_UUID = 'not-a-uuid';

describe('filterValidation', () => {

describe('isValidUuid', () => {
it('returns true for valid UUID', () => {
expect(isValidUuid(VALID_UUID)).toBe(true);
    });

it('returns false for invalid UUID', () => {
expect(isValidUuid(INVALID_UUID)).toBe(false);
    });

it('returns false for empty string', () => {
expect(isValidUuid('')).toBe(false);
    });

it('returns false for non-string', () => {
expect(isValidUuid(123 as unknown as string)).toBe(false);
expect(isValidUuid(null as unknown as string)).toBe(false);
expect(isValidUuid(undefined as unknown as string)).toBe(false);
    });
  });

describe('isValidIsoDate', () => {
it('returns true for date-only ISO string', () => {
expect(isValidIsoDate('2026-01-01')).toBe(true);
    });

it('returns true for full ISO datetime', () => {
expect(isValidIsoDate('2026-01-01T00:00:00Z')).toBe(true);
    });

it('returns false for invalid date string', () => {
expect(isValidIsoDate('not-a-date')).toBe(false);
    });

it('returns false for empty string', () => {
expect(isValidIsoDate('')).toBe(false);
    });
  });

describe('isValidDateRange', () => {
it('returns true when from and to are both undefined', () => {
expect(isValidDateRange()).toBe(true);
    });

it('returns true when only from is defined', () => {
expect(isValidDateRange('2026-01-01')).toBe(true);
    });

it('returns true when only to is defined', () => {
expect(isValidDateRange(undefined, '2026-12-31')).toBe(true);
    });

it('returns true when from <= to', () => {
expect(isValidDateRange('2026-01-01', '2026-12-31')).toBe(true);
    });

it('returns true when from == to', () => {
expect(isValidDateRange('2026-01-01', '2026-01-01')).toBe(true);
    });

it('returns false when from > to', () => {
expect(isValidDateRange('2026-12-31', '2026-01-01')).toBe(false);
    });
  });

describe('isValidActorId', () => {
it('returns true for undefined', () => {
expect(isValidActorId(undefined)).toBe(true);
    });

it('returns true for empty string', () => {
expect(isValidActorId('')).toBe(true);
    });

it('returns true for valid UUID', () => {
expect(isValidActorId(VALID_UUID)).toBe(true);
    });

it('returns false for invalid UUID', () => {
expect(isValidActorId(INVALID_UUID)).toBe(false);
    });
  });

describe('isValidTargetId', () => {
it('returns true for undefined', () => {
expect(isValidTargetId(undefined)).toBe(true);
    });

it('returns true for valid UUID', () => {
expect(isValidTargetId(VALID_UUID)).toBe(true);
    });

it('returns false for invalid UUID', () => {
expect(isValidTargetId(INVALID_UUID)).toBe(false);
    });
  });

describe('isValidAction', () => {
it('returns true for empty/undefined', () => {
expect(isValidAction(undefined)).toBe(true);
expect(isValidAction('')).toBe(true);
    });

it('returns true for short action', () => {
expect(isValidAction('role.grant')).toBe(true);
    });

it('returns false for non-string', () => {
expect(isValidAction(123 as unknown as string)).toBe(false);
    });
  });

describe('isValidTargetType', () => {
it('returns true for empty/undefined', () => {
expect(isValidTargetType(undefined)).toBe(true);
    });

it('returns true for short target type', () => {
expect(isValidTargetType('user')).toBe(true);
    });
  });

describe('validateAuditLogFilters', () => {
it('returns no errors for empty filters', () => {
const errors = validateAuditLogFilters({});
expect(errors).toEqual([]);
    });

it('returns no errors for valid filters', () => {
const errors = validateAuditLogFilters({
actorId: VALID_UUID,
action: 'role.grant',
targetType: 'user',
      });
expect(errors).toEqual([]);
    });

it('returns error for invalid actorId', () => {
const errors = validateAuditLogFilters({ actorId: 'not-a-uuid' });
expect(errors.length).toBeGreaterThan(0);
expect(errors[0]?.field).toBe('actorId');
    });

it('returns error for invalid date range', () => {
const errors = validateAuditLogFilters({
from: '2026-12-31',
to: '2026-01-01',
      });
expect(errors.length).toBeGreaterThan(0);
    });
  });

describe('isValidAuditLogFilters', () => {
it('returns true for valid filters', () => {
expect(isValidAuditLogFilters({})).toBe(true);
expect(
isValidAuditLogFilters({ actorId: VALID_UUID, action: 'role.grant' }),
      ).toBe(true);
    });

it('returns false for invalid filters', () => {
expect(isValidAuditLogFilters({ actorId: 'not-a-uuid' })).toBe(false);
    });
  });

describe('normalizeAuditLogFilters', () => {
it('returns empty object for empty input', () => {
expect(normalizeAuditLogFilters({})).toEqual({});
    });

it('drops invalid values', () => {
const result = normalizeAuditLogFilters({
actorId: 'not-a-uuid',
action: 'role.grant',
      });
expect(result.actorId).toBeUndefined();
expect(result.action).toBe('role.grant');
    });

it('keeps valid values', () => {
const result = normalizeAuditLogFilters({
actorId: VALID_UUID,
action: 'role.grant',
      });
expect(result.actorId).toBe(VALID_UUID);
expect(result.action).toBe('role.grant');
    });
  });

describe('hasActiveFilters', () => {
it('returns false for empty filters', () => {
expect(hasActiveFilters({})).toBe(false);
    });

it('returns true when any filter is set', () => {
expect(hasActiveFilters({ actorId: VALID_UUID })).toBe(true);
expect(hasActiveFilters({ action: 'role.grant' })).toBe(true);
expect(hasActiveFilters({ targetType: 'user' })).toBe(true);
    });
  });

describe('areFiltersEqual', () => {
it('returns true for equal filters', () => {
const a = { actorId: 'x', action: 'role.grant' };
const b = { actorId: 'x', action: 'role.grant' };
expect(areFiltersEqual(a, b)).toBe(true);
    });

it('returns false for different filters', () => {
const a = { actorId: 'x' };
const b = { actorId: 'y' };
expect(areFiltersEqual(a, b)).toBe(false);
    });

it('returns true for two empty filters', () => {
expect(areFiltersEqual({}, {})).toBe(true);
    });
  });
});