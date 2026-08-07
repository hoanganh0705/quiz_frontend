/**
 * `features/admin/comment-moderation/__tests__/comment-id-validation.spec.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.B3.
 *
 * Locks the structural invariants of `comment-id-validation.ts`:
 *
 *   1. `COMMENT_ID_UUID_REGEX` matches the canonical nil UUID v4 and
 *      other valid v4 ids (case-insensitive); rejects malformed ids.
 *   2. `validateCommentId` is total: every input — valid, malformed,
 *      null, undefined, empty, non-string — returns a typed result.
 *   3. `isCommentSelfModerationAttempt` is total: missing comment
 *      authors are not flagged as self-attempts; equal ids are flagged;
 *      unequal ids are not flagged.
 */

import { describe, expect, it } from 'vitest';

import {
  COMMENT_ID_UUID_REGEX,
  isCommentSelfModerationAttempt,
  validateCommentId,
} from '../comment-id-validation';

describe('comment-id-validation', () => {
  describe('COMMENT_ID_UUID_REGEX', () => {
    it('matches the nil UUID v4', () => {
      expect(
        COMMENT_ID_UUID_REGEX.test('00000000-0000-4000-8000-000000000000'),
      ).toBe(true);
    });

    it('matches additional valid v4 ids', () => {
      expect(
        COMMENT_ID_UUID_REGEX.test('12345678-1234-4123-8123-123456789abc'),
      ).toBe(true);
      expect(
        COMMENT_ID_UUID_REGEX.test('abcdefab-cdef-4123-a456-1234567890ab'),
      ).toBe(true);
    });

    it('matches case-insensitively', () => {
      expect(
        COMMENT_ID_UUID_REGEX.test('ABCDEFAB-CDEF-4123-A456-1234567890AB'),
      ).toBe(true);
    });

    it('rejects malformed ids', () => {
      expect(COMMENT_ID_UUID_REGEX.test('not-a-uuid')).toBe(false);
      // Version nibble is [1-5] per RFC 4122; 6/7/8/9/a-f are invalid.
      expect(
        COMMENT_ID_UUID_REGEX.test('00000000-0000-6000-8000-000000000000'),
      ).toBe(false);
      // Variant nibble is [89ab] per RFC 4122; 0-7 are reserved/NCS.
      expect(
        COMMENT_ID_UUID_REGEX.test('00000000-0000-4000-7000-000000000000'),
      ).toBe(false);
      expect(
        COMMENT_ID_UUID_REGEX.test('00000000000040008000000000000000'),
      ).toBe(false); // no dashes
      expect(COMMENT_ID_UUID_REGEX.test('')).toBe(false);
    });
  });

  describe('validateCommentId', () => {
    it('returns ok: true for a valid UUID v4', () => {
      expect(
        validateCommentId('00000000-0000-4000-8000-000000000000'),
      ).toEqual({ ok: true });
    });

    it('returns invalid-uuid for malformed ids', () => {
      expect(validateCommentId('not-a-uuid')).toEqual({
        ok: false,
        reason: 'invalid-uuid',
      });
      // Version nibble [1-5] — 6 is invalid.
      expect(
        validateCommentId('00000000-0000-6000-8000-000000000000'),
      ).toEqual({
        ok: false,
        reason: 'invalid-uuid',
      });
    });

    it('returns not-a-string for non-string inputs', () => {
      expect(validateCommentId(null)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateCommentId(undefined)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateCommentId(42)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateCommentId({})).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateCommentId('')).toEqual({
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
        expect(() => validateCommentId(input)).not.toThrow();
        const result = validateCommentId(input);
        expect(typeof result.ok).toBe('boolean');
      }
    });
  });

  describe('isCommentSelfModerationAttempt', () => {
    it('returns true when ids are equal', () => {
      expect(isCommentSelfModerationAttempt('user-1', 'user-1')).toBe(true);
      expect(
        isCommentSelfModerationAttempt(
          '00000000-0000-4000-8000-000000000000',
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBe(true);
    });

    it('returns false when ids are unequal', () => {
      expect(isCommentSelfModerationAttempt('user-1', 'user-2')).toBe(false);
    });

    it('returns false when the comment-author id is missing', () => {
      expect(isCommentSelfModerationAttempt(null, 'user-1')).toBe(false);
      expect(isCommentSelfModerationAttempt(undefined, 'user-1')).toBe(false);
      expect(isCommentSelfModerationAttempt('', 'user-1')).toBe(false);
    });

    it('returns false when the current user id is missing', () => {
      expect(isCommentSelfModerationAttempt('user-1', null)).toBe(false);
      expect(isCommentSelfModerationAttempt('user-1', undefined)).toBe(false);
      expect(isCommentSelfModerationAttempt('user-1', '')).toBe(false);
    });

    it('returns false when both sides are missing', () => {
      expect(isCommentSelfModerationAttempt(null, null)).toBe(false);
      expect(isCommentSelfModerationAttempt(undefined, undefined)).toBe(false);
      expect(isCommentSelfModerationAttempt('', '')).toBe(false);
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
        expect(() =>
          isCommentSelfModerationAttempt(author, current),
        ).not.toThrow();
      }
    });
  });
});