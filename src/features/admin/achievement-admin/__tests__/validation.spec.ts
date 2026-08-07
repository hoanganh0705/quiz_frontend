/**
 * `features/admin/achievement-admin/__tests__/validation.spec.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.B4.
 */

import { expect, test } from 'vitest';

import {
  validateUserId,
  validateBadgeId,
  isSelfRevokeAttempt,
  UUIDV4_REGEX,
  zodUuidV4,
} from '../validation';

const VALID_UUID = '00000000-0000-4000-8000-000000000000';
const VALID_UUID_2 = 'a1b2c3d4-1234-4567-8901-abcdef123456';

// ─── UUIDV4_REGEX ──────────────────────────────────────────────────────────

test('UUIDV4_REGEX matches valid UUIDv4', () => {
  expect(UUIDV4_REGEX.test(VALID_UUID)).toBe(true);
  expect(UUIDV4_REGEX.test(VALID_UUID_2)).toBe(true);
});

test('UUIDV4_REGEX rejects non-UUID strings', () => {
  expect(UUIDV4_REGEX.test('not-a-uuid')).toBe(false);
  expect(UUIDV4_REGEX.test('')).toBe(false);
  expect(UUIDV4_REGEX.test('00000000-0000-3000-8000-000000000000')).toBe(false); // v3
  expect(UUIDV4_REGEX.test('00000000-0000-5000-8000-000000000000')).toBe(false); // v5
  expect(UUIDV4_REGEX.test('00000000-0000-4000-0000-000000000000')).toBe(false); // variant wrong
});

// ─── validateUserId ─────────────────────────────────────────────────────────

test('validateUserId — valid UUIDv4 returns ok', () => {
  const result = validateUserId(VALID_UUID);
  expect(result).toEqual({ ok: true, value: VALID_UUID });
});

test('validateUserId — invalid UUID returns invalid-uuid', () => {
  const result = validateUserId('not-a-uuid');
  expect(result).toEqual({ ok: false, reason: 'invalid-uuid' });
});

test('validateUserId — null returns not-a-string', () => {
  const result = validateUserId(null);
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateUserId — undefined returns not-a-string', () => {
  const result = validateUserId(undefined);
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateUserId — empty string returns not-a-string', () => {
  // Empty string is caught as 'not-a-string' before UUID validation.
  const result = validateUserId('');
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateUserId — whitespace string returns not-a-string', () => {
  // Whitespace-only strings are caught as 'not-a-string' before UUID validation.
  const result = validateUserId('   ');
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateUserId — number returns not-a-string', () => {
  const result = validateUserId(123 as unknown as string);
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

// ─── validateBadgeId ────────────────────────────────────────────────────────

test('validateBadgeId — valid UUIDv4 returns ok', () => {
  const result = validateBadgeId(VALID_UUID);
  expect(result).toEqual({ ok: true, value: VALID_UUID });
});

test('validateBadgeId — invalid UUID returns invalid-uuid', () => {
  const result = validateBadgeId('not-a-uuid');
  expect(result).toEqual({ ok: false, reason: 'invalid-uuid' });
});

test('validateBadgeId — null returns not-a-string', () => {
  const result = validateBadgeId(null);
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateBadgeId — undefined returns not-a-string', () => {
  const result = validateBadgeId(undefined);
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

test('validateBadgeId — empty string returns not-a-string', () => {
  // Empty string is caught as 'not-a-string' before UUID validation.
  const result = validateBadgeId('');
  expect(result).toEqual({ ok: false, reason: 'not-a-string' });
});

// ─── isSelfRevokeAttempt ────────────────────────────────────────────────────

test('isSelfRevokeAttempt — same ids returns true', () => {
  expect(isSelfRevokeAttempt('user-1', 'user-1')).toBe(true);
  expect(isSelfRevokeAttempt(VALID_UUID, VALID_UUID)).toBe(true);
});

test('isSelfRevokeAttempt — different ids returns false', () => {
  expect(isSelfRevokeAttempt('user-1', 'user-2')).toBe(false);
  expect(isSelfRevokeAttempt(VALID_UUID, VALID_UUID_2)).toBe(false);
});

test('isSelfRevokeAttempt — null target returns false', () => {
  expect(isSelfRevokeAttempt(null, 'user-1')).toBe(false);
});

test('isSelfRevokeAttempt — undefined target returns false', () => {
  expect(isSelfRevokeAttempt(undefined, 'user-1')).toBe(false);
});

test('isSelfRevokeAttempt — null current returns false', () => {
  expect(isSelfRevokeAttempt('user-1', null)).toBe(false);
});

test('isSelfRevokeAttempt — undefined current returns false', () => {
  expect(isSelfRevokeAttempt('user-1', undefined)).toBe(false);
});

test('isSelfRevokeAttempt — both null returns false', () => {
  expect(isSelfRevokeAttempt(null, null)).toBe(false);
});

test('isSelfRevokeAttempt — both undefined returns false', () => {
  expect(isSelfRevokeAttempt(undefined, undefined)).toBe(false);
});

// ─── zodUuidV4 schema ───────────────────────────────────────────────────────

test('zodUuidV4 — valid UUID passes', () => {
  const result = zodUuidV4.safeParse(VALID_UUID);
  expect(result.success).toBe(true);
});

test('zodUuidV4 — invalid string fails', () => {
  const result = zodUuidV4.safeParse('not-a-uuid');
  expect(result.success).toBe(false);
});

test('zodUuidV4 — empty string fails', () => {
  const result = zodUuidV4.safeParse('');
  expect(result.success).toBe(false);
});
