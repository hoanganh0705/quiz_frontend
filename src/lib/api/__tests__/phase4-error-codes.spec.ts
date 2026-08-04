/**
 * Phase 4 priority-code coverage for `USER_COPY`.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.C3.
 *
 * Locks the 16 (now 22 — see C2) codes Phase 4 surfaces heavily plus
 * the bulk-endpoint 409 codes. Future copy edits cannot accidentally
 * blank out any of these call sites because the spec pins:
 *
 *   - non-empty title + body per code
 *   - the explicit action verb (e.g. "in-progress" for
 *     `ATTEMPT_ALREADY_STARTED`) the ticket calls out
 *   - the placement field (`toast: 'top' | 'inline' | 'silent'`)
 *     the Story 4.14 runner depends on for cross-tab reconciliation
 *   - the fallback path (`getUserCopy('NOT_A_REAL_CODE')` returns
 *     `UNKNOWN_USER_COPY`)
 *
 * The full 132-entry completeness check lives in
 * `error-codes.ts`'s structural `Record<ErrorCode, …>` type and the
 * existing `error-codes.spec.ts`; this spec only locks the codes
 * Phase 4 specifically depends on.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.4.
 */
import { describe, expect, it } from 'vitest';
import {
  USER_COPY,
  UNKNOWN_USER_COPY,
  getUserCopy,
  type ErrorCode,
  type UserCopyEntry,
} from '../error-codes';

/**
 * The 22-codes Phase 4 surfaces heavily. Includes the original 16
 * from TKT-4.1.C2 plus the bulk-endpoint 409 codes the ticket body
 * calls out (`COMMENT_DUPLICATE_REPORT`, `QUIZ_QUESTION_POSITION_*`,
 * `QUIZ_ANSWER_OPTION_*`, `QUIZ_MULTIPLE_CORRECT_OPTIONS`,
 * `ATTEMPT_QUESTION_INVALID`, `ATTEMPT_ANSWER_NOT_FOUND`).
 */
const PHASE4_PRIORITY_CODES: readonly ErrorCode[] = [
  'ATTEMPT_ALREADY_STARTED',
  'ATTEMPT_NOT_ACTIVE',
  'ATTEMPT_QUESTION_ALREADY_ANSWERED',
  'ATTEMPT_QUIZ_NOT_PUBLISHED',
  'ATTEMPT_NOT_COMPLETED',
  'ATTEMPT_QUESTION_INVALID',
  'ATTEMPT_ANSWER_NOT_FOUND',
  'QUIZ_INSUFFICIENT_QUESTIONS',
  'QUIZ_SLUG_CONFLICT',
  'QUIZ_QUESTION_POSITION_CONFLICT',
  'QUIZ_ANSWER_OPTION_POSITION_CONFLICT',
  'QUIZ_MULTIPLE_CORRECT_OPTIONS',
  'QUIZ_VERSION_IMMUTABLE',
  'REVIEW_ATTEMPT_REQUIRED',
  'REVIEW_FORBIDDEN',
  'REVIEW_CONFLICT',
  'COMMENT_REPLY_LIMIT_EXCEEDED',
  'COMMENT_SELF_VOTE',
  'COMMENT_SELF_REPORT',
  'COMMENT_DUPLICATE_REPORT',
  'COLLECTION_CONFLICT',
  'BOOKMARK_COLLECTION_NOT_FOUND',
];

/**
 * Codes whose copy must mention a specific action verb per TKT-4.1.C2.
 * A copy edit that drops the verb fails this spec.
 */
const REQUIRED_VERBS: Partial<Record<ErrorCode, string>> = {
  ATTEMPT_ALREADY_STARTED: 'in-progress',
  ATTEMPT_QUESTION_ALREADY_ANSWERED: 'answered',
  QUIZ_INSUFFICIENT_QUESTIONS: 'questions',
  QUIZ_VERSION_IMMUTABLE: 'immutable',
  REVIEW_ATTEMPT_REQUIRED: 'attempt',
  COMMENT_REPLY_LIMIT_EXCEEDED: 'reply',
  QUIZ_SLUG_CONFLICT: 'slug',
  COLLECTION_CONFLICT: 'collection',
  BOOKMARK_COLLECTION_NOT_FOUND: 'collection',
  COMMENT_DUPLICATE_REPORT: 'reported',
};

describe('phase4-error-codes — USER_COPY coverage', () => {
  it('every Phase-4 priority code has a USER_COPY entry with non-empty title + body', () => {
    for (const code of PHASE4_PRIORITY_CODES) {
      const entry: UserCopyEntry = USER_COPY[code];
      expect(entry, `missing entry for ${code}`).toBeDefined();
      expect(entry.title.length, `empty title for ${code}`).toBeGreaterThan(0);
      expect(entry.body.length, `empty body for ${code}`).toBeGreaterThan(0);
    }
  });

  it('priority codes include all the bulk-endpoint 409 codes', () => {
    expect(PHASE4_PRIORITY_CODES).toContain('COMMENT_DUPLICATE_REPORT');
    expect(PHASE4_PRIORITY_CODES).toContain('QUIZ_QUESTION_POSITION_CONFLICT');
    expect(PHASE4_PRIORITY_CODES).toContain('QUIZ_ANSWER_OPTION_POSITION_CONFLICT');
    expect(PHASE4_PRIORITY_CODES).toContain('QUIZ_MULTIPLE_CORRECT_OPTIONS');
  });

  it('action-verb copy assertions (TKT-4.1.C2 testing checklist)', () => {
    for (const [code, expectedFragment] of Object.entries(REQUIRED_VERBS) as Array<
      [ErrorCode, string]
    >) {
      const entry = USER_COPY[code];
      // Body or title must contain the fragment (case-insensitive)
      const haystack = `${entry.title} ${entry.body}`.toLowerCase();
      expect(haystack, `${code} copy must mention "${expectedFragment}"`).toContain(
        expectedFragment.toLowerCase(),
      );
    }
  });

  it('priority code copy does not exceed 200 characters per body', () => {
    for (const code of PHASE4_PRIORITY_CODES) {
      const entry = USER_COPY[code];
      expect(entry.body.length, `${code} body too long`).toBeLessThanOrEqual(200);
    }
  });

  it('priority code copy is not duplicated (title ≠ body literally)', () => {
    for (const code of PHASE4_PRIORITY_CODES) {
      const entry = USER_COPY[code];
      expect(entry.title === entry.body, `${code} body repeats title verbatim`).toBe(
        false,
      );
    }
  });

  it('ATTEMPT_ALREADY_STARTED uses top placement (cross-tab toast)', () => {
    // T-4.14.4 — the runner surfaces this code as a top-of-page toast
    // because cross-tab reconciliation expects a placement that does
    // not collide with the runner's inline question error.
    expect(USER_COPY.ATTEMPT_ALREADY_STARTED.toast).toBe('top');
  });

  it('ATTEMPT_ANSWER_NOT_FOUND uses silent placement (withdrawal reconciliation)', () => {
    // T-4.14.4 — the withdrawal reconciliation hook consumes this
    // code as a non-actionable reconciliation cue. No toast.
    expect(USER_COPY.ATTEMPT_ANSWER_NOT_FOUND.toast).toBe('silent');
  });

  it('ATTEMPT_VALIDATION_FAILED uses inline placement (field-addressable)', () => {
    // T-4.14.4 — the picker renders this against the answer field.
    expect(USER_COPY.ATTEMPT_VALIDATION_FAILED.toast).toBe('inline');
  });

  it('ATTEMPT_VALIDATION_FAILED uses the Story 4.15 banner copy (T-4.15.4)', () => {
    // T-4.15.4 — the runner surfaces the complete-attempt validation
    // failure as an inline banner with the approved wording. The
    // Story 4.15 priority override must win against the Phase 4
    // generic copy.
    expect(USER_COPY.ATTEMPT_VALIDATION_FAILED.title).toBe(
      'Submit at least one answer',
    );
    expect(USER_COPY.ATTEMPT_VALIDATION_FAILED.body).toMatch(/at least one/);
  });

  it('remaining ATTEMPT_* codes use inline placement', () => {
    // The runner surfaces the rest of the attempt codes against the
    // closest form-error slot. Regression guard so a future edit
    // cannot silently flip them to silent or top.
    const inlineCodes: ErrorCode[] = [
      'ATTEMPT_NOT_FOUND',
      'ATTEMPT_FORBIDDEN',
      'ATTEMPT_NOT_ACTIVE',
      'ATTEMPT_QUESTION_ALREADY_ANSWERED',
      'ATTEMPT_QUIZ_NOT_PUBLISHED',
      'ATTEMPT_QUESTION_INVALID',
      'ATTEMPT_NOT_COMPLETED',
    ];
    for (const code of inlineCodes) {
      expect(USER_COPY[code].toast, `${code} should stay inline`).toBe('inline');
    }
  });

  it('getUserCopy fallback path returns UNKNOWN_USER_COPY for unknown codes', () => {
    expect(getUserCopy('NOT_A_REAL_CODE')).toBe(UNKNOWN_USER_COPY);
    expect(getUserCopy('')).toBe(UNKNOWN_USER_COPY);
    // Unknown code via a bogus string that LOOKS like a known prefix
    // must still fall back.
    expect(getUserCopy('QUIZ_NOT_FOUND_BUT_WITH_BOGUS_SUFFIX')).toBe(UNKNOWN_USER_COPY);
  });

  it('KNOWN_ERROR_CODES still includes all priority codes (regression: codes aren\'t removed)', () => {
    for (const code of PHASE4_PRIORITY_CODES) {
      expect(
        (USER_COPY as Record<string, UserCopyEntry>)[code],
        `USER_COPY lost ${code}`,
      ).toBeDefined();
      expect(getUserCopy(code)).toBe(USER_COPY[code]);
    }
  });
});
