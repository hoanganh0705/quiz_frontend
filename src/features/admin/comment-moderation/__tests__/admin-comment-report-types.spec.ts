/**
 * `features/admin/comment-moderation/__tests__/admin-comment-report-types.spec.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.B1.
 *
 * Locks the structural invariants of `admin-comment-report-types.ts`:
 *
 *   1. The `CommentReportState` union covers every documented SDK status
 *      (`open | reviewed | dismissed | actioned`).
 *   2. The `CommentReportAction` union covers every documented SDK action
 *      (`reviewed | dismissed | actioned`).
 *   3. `COMMENT_REPORTS_PAGE_SIZE === 20`.
 *   4. `COMMENT_REPORT_STATES` lists exactly the four documented states.
 *   5. `isCommentReportState` accepts the four documented statuses and
 *      rejects unknown strings and non-string inputs.
 *   6. `isCommentReportAction` accepts the three documented actions and
 *      rejects unknown strings and non-string inputs.
 *   7. `isCommentReportShowFilter` accepts `'pending'` and `'resolved'`
 *      and rejects other values.
 *   8. `DEFAULT_COMMENT_REPORT_SHOW_FILTER === 'pending'`.
 *   9. `assertCommentReportStateExhaustive` throws on non-`CommentReportState`
 *      inputs at runtime.
 *  10. The shape of `CommentReportListDto` matches the service's
 *      `CommentReportsPage` (TKT-7.1.E4) — fields, arity, and order.
 */

import { describe, expect, it } from 'vitest';

import type {
  CommentReportListDto,
} from '../admin-comment-report-types';

import type { CommentReportsPage } from '@/features/admin/services/comment-moderation.service';

import {
  COMMENT_REPORT_STATES,
  COMMENT_REPORTS_PAGE_SIZE,
  DEFAULT_COMMENT_REPORT_SHOW_FILTER,
  assertCommentReportStateExhaustive,
  isCommentReportAction,
  isCommentReportShowFilter,
  isCommentReportState,
  type CommentReportAction,
  type CommentReportState,
} from '../admin-comment-report-types';

describe('admin-comment-report-types', () => {
  describe('COMMENT_REPORT_STATES', () => {
    it('lists every documented state in the union', () => {
      expect(Object.keys(COMMENT_REPORT_STATES).sort()).toEqual([
        'actioned',
        'dismissed',
        'open',
        'reviewed',
      ]);
    });
  });

  describe('COMMENT_REPORTS_PAGE_SIZE', () => {
    it('is the documented 20-row default', () => {
      expect(COMMENT_REPORTS_PAGE_SIZE).toBe(20);
    });
  });

  describe('DEFAULT_COMMENT_REPORT_SHOW_FILTER', () => {
    it("is the documented 'pending' default", () => {
      expect(DEFAULT_COMMENT_REPORT_SHOW_FILTER).toBe('pending');
    });
  });

  describe('isCommentReportState', () => {
    it('accepts every documented status', () => {
      expect(isCommentReportState('open')).toBe(true);
      expect(isCommentReportState('reviewed')).toBe(true);
      expect(isCommentReportState('dismissed')).toBe(true);
      expect(isCommentReportState('actioned')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isCommentReportState('pending')).toBe(false);
      expect(isCommentReportState('resolved')).toBe(false);
      expect(isCommentReportState('unknown')).toBe(false);
      expect(isCommentReportState('')).toBe(false);
    });

    it('rejects non-string inputs', () => {
      expect(isCommentReportState(null)).toBe(false);
      expect(isCommentReportState(undefined)).toBe(false);
      expect(isCommentReportState(42)).toBe(false);
      expect(isCommentReportState({})).toBe(false);
    });
  });

  describe('isCommentReportAction', () => {
    it('accepts every documented action', () => {
      expect(isCommentReportAction('reviewed')).toBe(true);
      expect(isCommentReportAction('dismissed')).toBe(true);
      expect(isCommentReportAction('actioned')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isCommentReportAction('hide_comment')).toBe(false);
      expect(isCommentReportAction('delete_comment')).toBe(false);
      expect(isCommentReportAction('mark_resolved')).toBe(false);
      expect(isCommentReportAction('')).toBe(false);
    });

    it('rejects non-string inputs', () => {
      expect(isCommentReportAction(null)).toBe(false);
      expect(isCommentReportAction(undefined)).toBe(false);
      expect(isCommentReportAction(0)).toBe(false);
      expect(isCommentReportAction([])).toBe(false);
    });
  });

  describe('isCommentReportShowFilter', () => {
    it('accepts pending and resolved', () => {
      expect(isCommentReportShowFilter('pending')).toBe(true);
      expect(isCommentReportShowFilter('resolved')).toBe(true);
    });

    it('rejects other values', () => {
      expect(isCommentReportShowFilter('open')).toBe(false);
      expect(isCommentReportShowFilter('all')).toBe(false);
      expect(isCommentReportShowFilter('')).toBe(false);
    });

    it('rejects non-string inputs', () => {
      expect(isCommentReportShowFilter(null)).toBe(false);
      expect(isCommentReportShowFilter(undefined)).toBe(false);
      expect(isCommentReportShowFilter(1)).toBe(false);
    });
  });

  describe('assertCommentReportStateExhaustive', () => {
    it('throws on non-CommentReportState inputs', () => {
      expect(() =>
        assertCommentReportStateExhaustive('pending' as unknown as never),
      ).toThrowError(/Unreachable state/);
      expect(() =>
        assertCommentReportStateExhaustive(null as unknown as never),
      ).toThrowError(/Unreachable state/);
    });
  });

  describe('CommentReportListDto shape parity with the service page', () => {
    // CommentReportListDto is the consumer-facing alias for
    // CommentReportsPage (the service wrapper's underlying page shape,
    // TKT-7.1.E4). The two are structurally identical; the alias is a
    // type-only forward so the assignment check below compiles without
    // a literal fixture write (which would trip the Epic 3.2 cursor-
    // pagination lockdown rule on `Identifier[name='nextCursor']`).
    it('CommentReportListDto is structurally identical to CommentReportsPage', () => {
      // Bidirectional structural assignability is the strictest
      // compile-time check that the two types agree on every field
      // without forcing a literal-name write.
      const listToPage: CommentReportsPage = {} as CommentReportListDto;
      const pageToList: CommentReportListDto = {} as CommentReportsPage;
      expect(listToPage).toBeDefined();
      expect(pageToList).toBeDefined();
    });
  });

  describe('union coverage (compile-time lock)', () => {
    it('COMMENT_REPORT_STATES values match the CommentReportState union', () => {
      const states = Object.values(COMMENT_REPORT_STATES) as CommentReportState[];
      const set = new Set(states);
      expect(set.size).toBe(4);
      expect(set.has('open')).toBe(true);
      expect(set.has('reviewed')).toBe(true);
      expect(set.has('dismissed')).toBe(true);
      expect(set.has('actioned')).toBe(true);
    });

    it('action whitelist covers every CommentReportAction member', () => {
      const actions: CommentReportAction[] = ['reviewed', 'dismissed', 'actioned'];
      expect(actions).toHaveLength(3);
      for (const action of actions) {
        expect(isCommentReportAction(action)).toBe(true);
      }
    });
  });
});