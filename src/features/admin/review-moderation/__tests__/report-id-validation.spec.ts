

import { describe, expect, it } from 'vitest';

import {
REPORT_ID_UUID_REGEX,
isSelfModerationAttempt,
validateReportId,
} from '../report-id-validation';

describe('report-id-validation', () => {
describe('REPORT_ID_UUID_REGEX', () => {
it('matches the nil UUID v4', () => {
expect(
REPORT_ID_UUID_REGEX.test('00000000-0000-4000-8000-000000000000'),
      ).toBe(true);
    });

it('matches additional valid v4 ids', () => {
expect(
REPORT_ID_UUID_REGEX.test('12345678-1234-4123-8123-123456789abc'),
      ).toBe(true);
expect(
REPORT_ID_UUID_REGEX.test('abcdefab-cdef-4123-a456-1234567890ab'),
      ).toBe(true);
    });

it('matches case-insensitively', () => {
expect(
REPORT_ID_UUID_REGEX.test('ABCDEFAB-CDEF-4123-A456-1234567890AB'),
      ).toBe(true);
    });

it('rejects malformed ids', () => {
expect(REPORT_ID_UUID_REGEX.test('not-a-uuid')).toBe(false);

expect(
REPORT_ID_UUID_REGEX.test('00000000-0000-6000-8000-000000000000'),
      ).toBe(false);

expect(
REPORT_ID_UUID_REGEX.test('00000000-0000-4000-7000-000000000000'),
      ).toBe(false);
expect(
REPORT_ID_UUID_REGEX.test('00000000000040008000000000000000'),
      ).toBe(false);
expect(
REPORT_ID_UUID_REGEX.test(''),
      ).toBe(false);
    });
  });

describe('validateReportId', () => {
it('returns ok: true for a valid UUID v4', () => {
expect(
validateReportId('00000000-0000-4000-8000-000000000000'),
      ).toEqual({ ok: true });
    });

it('returns invalid-uuid for malformed ids', () => {
expect(validateReportId('not-a-uuid')).toEqual({
ok: false,
reason: 'invalid-uuid',
      });

expect(
validateReportId('00000000-0000-6000-8000-000000000000'),
      ).toEqual({
ok: false,
reason: 'invalid-uuid',
      });
    });

it('returns not-a-string for non-string inputs', () => {
expect(validateReportId(null)).toEqual({
ok: false,
reason: 'not-a-string',
      });
expect(validateReportId(undefined)).toEqual({
ok: false,
reason: 'not-a-string',
      });
expect(validateReportId(42)).toEqual({
ok: false,
reason: 'not-a-string',
      });
expect(validateReportId({})).toEqual({
ok: false,
reason: 'not-a-string',
      });
expect(validateReportId('')).toEqual({
ok: false,
reason: 'not-a-string',
      });
    });

it('is total and never throws', () => {
const inputs: unknown[] = [
null,
undefined,
42,
'',
'not-a-uuid',
'00000000-0000-4000-8000-000000000000',
{},
[],
true,
false,
      ];
for (const input of inputs) {
expect(() => validateReportId(input)).not.toThrow();
const result = validateReportId(input);
expect(typeof result.ok).toBe('boolean');
      }
    });
  });

describe('isSelfModerationAttempt', () => {
it('returns true when ids are equal', () => {
expect(isSelfModerationAttempt('user-1', 'user-1')).toBe(true);
expect(
isSelfModerationAttempt(
'00000000-0000-4000-8000-000000000000',
'00000000-0000-4000-8000-000000000000',
        ),
      ).toBe(true);
    });

it('returns false when ids are unequal', () => {
expect(isSelfModerationAttempt('user-1', 'user-2')).toBe(false);
    });

it('returns false when the author id is missing', () => {
expect(isSelfModerationAttempt(null, 'user-1')).toBe(false);
expect(isSelfModerationAttempt(undefined, 'user-1')).toBe(false);
expect(isSelfModerationAttempt('', 'user-1')).toBe(false);
    });

it('returns false when the current user id is missing', () => {
expect(isSelfModerationAttempt('user-1', null)).toBe(false);
expect(isSelfModerationAttempt('user-1', undefined)).toBe(false);
expect(isSelfModerationAttempt('user-1', '')).toBe(false);
    });

it('returns false when both sides are missing', () => {
expect(isSelfModerationAttempt(null, null)).toBe(false);
expect(isSelfModerationAttempt(undefined, undefined)).toBe(false);
expect(isSelfModerationAttempt('', '')).toBe(false);
    });

it('is total and never throws', () => {
const inputs: Array<
[string | null | undefined, string | null | undefined]
      > = [
['user-1', 'user-2'],
[null, 'user-2'],
['user-1', null],
['', ''],
['user-1', undefined],
      ];
for (const [author, current] of inputs) {
expect(() => isSelfModerationAttempt(author, current)).not.toThrow();
      }
    });
  });
});