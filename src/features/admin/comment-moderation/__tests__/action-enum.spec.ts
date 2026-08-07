/**
 * `features/admin/comment-moderation/__tests__/action-enum.spec.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.B2.
 *
 * Locks the structural invariants of `action-enum.ts`:
 *
 *   1. `COMMENT_REPORT_CONSUMER_ACTIONS` lists exactly the documented
 *      four actions (`dismiss | acknowledge | mark_resolved | hide_comment`).
 *   2. `isCommentReportConsumerAction` accepts every documented action
 *      and rejects unknown strings / non-string inputs.
 *   3. Every documented action has non-empty metadata (label,
 *      breadcrumbAction).
 *   4. **No irreversible entries** — every documented action is
 *      reversible in practice; `requiresTypedConfirm` is `false` and
 *      `confirmString` is `null` for every action.
 *   5. `requiresTypedConfirm` matches the metadata's flag (always
 *      `false`).
 *   6. `getCommentReportActionConfirmString` returns `null` for every
 *      documented action.
 *   7. `getSdkStatusForCommentReportAction` returns the documented SDK
 *      mapping (`dismiss → dismissed`, `acknowledge → reviewed`,
 *      `mark_resolved → reviewed`, `hide_comment → actioned`).
 *   8. `requiresCompanionHide` is `true` only for `hide_comment`.
 *   9. `assertCommentReportActionCatalogueHolds` does not throw on the
 *      documented catalogue.
 *  10. The catalogue has no `requiresTypedConfirm: true` entries —
 *      locks the "no irreversible comment-side actions" invariant.
 */

import { describe, expect, it } from 'vitest';

import {
  COMMENT_REPORT_ACTIONS,
  COMMENT_REPORT_CONSUMER_ACTIONS,
  assertCommentReportActionCatalogueHolds,
  getCommentReportActionConfirmString,
  getCommentReportActionMetadata,
  getSdkStatusForCommentReportAction,
  isCommentReportConsumerAction,
  requiresCompanionHide,
  requiresTypedConfirm,
  type CommentReportConsumerAction,
} from '../action-enum';

describe('action-enum', () => {
  describe('COMMENT_REPORT_CONSUMER_ACTIONS', () => {
    it('lists the documented four actions', () => {
      expect([...COMMENT_REPORT_CONSUMER_ACTIONS]).toEqual([
        'dismiss',
        'acknowledge',
        'mark_resolved',
        'hide_comment',
      ]);
    });
  });

  describe('isCommentReportConsumerAction', () => {
    it('accepts every documented action', () => {
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        expect(isCommentReportConsumerAction(action)).toBe(true);
      }
    });

    it('rejects unknown strings', () => {
      expect(isCommentReportConsumerAction('unknown')).toBe(false);
      expect(isCommentReportConsumerAction('resolve')).toBe(false);
      expect(isCommentReportConsumerAction('hide_review')).toBe(false);
      expect(isCommentReportConsumerAction('delete_comment')).toBe(false);
      expect(isCommentReportConsumerAction('')).toBe(false);
    });

    it('rejects non-string inputs', () => {
      expect(isCommentReportConsumerAction(null)).toBe(false);
      expect(isCommentReportConsumerAction(undefined)).toBe(false);
      expect(isCommentReportConsumerAction(42)).toBe(false);
      expect(isCommentReportConsumerAction({})).toBe(false);
    });
  });

  describe('COMMENT_REPORT_ACTIONS catalogue', () => {
    it('every documented action has metadata', () => {
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        expect(COMMENT_REPORT_ACTIONS[action]).toBeDefined();
        expect(COMMENT_REPORT_ACTIONS[action].label.length).toBeGreaterThan(0);
        expect(COMMENT_REPORT_ACTIONS[action].breadcrumbAction.length).toBeGreaterThan(0);
      }
    });

    it('every action is reversible (no irreversible comment-side actions)', () => {
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        expect(COMMENT_REPORT_ACTIONS[action].reversible).toBe(true);
        expect(COMMENT_REPORT_ACTIONS[action].requiresTypedConfirm).toBe(false);
        expect(COMMENT_REPORT_ACTIONS[action].confirmString).toBeNull();
      }
    });

    it('audit-action type aligns with reversibility', () => {
      // hide_comment is destructive even though reversible — it
      // mutates comment visibility — and is wrapped in the audit shell.
      expect(COMMENT_REPORT_ACTIONS.hide_comment.auditActionType).toBe(
        'destructive',
      );
      expect(COMMENT_REPORT_ACTIONS.hide_comment.requiresCompanionHide).toBe(
        true,
      );
      // The other three actions are non-destructive; they only mutate
      // the report's status.
      expect(COMMENT_REPORT_ACTIONS.dismiss.auditActionType).toBe(
        'non-destructive',
      );
      expect(COMMENT_REPORT_ACTIONS.acknowledge.auditActionType).toBe(
        'non-destructive',
      );
      expect(COMMENT_REPORT_ACTIONS.mark_resolved.auditActionType).toBe(
        'non-destructive',
      );
    });

    it('only hide_comment requires the companion hide round-trip', () => {
      expect(requiresCompanionHide('hide_comment')).toBe(true);
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        if (action === 'hide_comment') continue;
        expect(requiresCompanionHide(action)).toBe(false);
      }
    });
  });

  describe('getCommentReportActionMetadata', () => {
    it('returns the matching record for documented actions', () => {
      const metadata = getCommentReportActionMetadata('dismiss');
      expect(metadata.label).toBe('Dismiss report');
      expect(metadata.sdkStatus).toBe('dismissed');
    });
  });

  describe('requiresTypedConfirm', () => {
    it('returns false for every documented action', () => {
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        expect(requiresTypedConfirm(action)).toBe(false);
      }
    });
  });

  describe('getCommentReportActionConfirmString', () => {
    it('returns null for every documented action', () => {
      for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
        expect(getCommentReportActionConfirmString(action)).toBeNull();
      }
    });
  });

  describe('getSdkStatusForCommentReportAction', () => {
    it('maps documented actions to documented SDK statuses', () => {
      expect(getSdkStatusForCommentReportAction('dismiss')).toBe('dismissed');
      expect(getSdkStatusForCommentReportAction('acknowledge')).toBe('reviewed');
      expect(getSdkStatusForCommentReportAction('mark_resolved')).toBe(
        'reviewed',
      );
      expect(getSdkStatusForCommentReportAction('hide_comment')).toBe(
        'actioned',
      );
    });
  });

  describe('assertCommentReportActionCatalogueHolds', () => {
    it('does not throw on the documented catalogue', () => {
      expect(() =>
        assertCommentReportActionCatalogueHolds(),
      ).not.toThrow();
    });
  });

  describe('compile-time coverage', () => {
    // The exhaustive assignment below forces TypeScript to flag any
    // drift between `COMMENT_REPORT_CONSUMER_ACTIONS` and the
    // consumer-facing `CommentReportConsumerAction` union. If a new
    // action is added to either side this assignment surfaces the
    // drift.
    it('every CommentReportConsumerAction has a metadata entry', () => {
      const all: readonly CommentReportConsumerAction[] =
        COMMENT_REPORT_CONSUMER_ACTIONS;
      expect(all.length).toBeGreaterThan(0);
      for (const action of all) {
        expect(COMMENT_REPORT_ACTIONS[action]).toBeDefined();
      }
    });
  });
});