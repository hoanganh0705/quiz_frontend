/**
 * `features/admin/review-moderation/__tests__/action-enum.spec.ts`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.B2.
 *
 * Locks the structural invariants of `action-enum.ts`:
 *
 *   1. `REPORT_CONSUMER_ACTIONS` lists exactly the documented actions.
 *   2. `isReportConsumerAction` accepts every documented action and
 *      rejects unknown strings.
 *   3. Every documented action has non-empty metadata; irreversible
 *      actions require typed-confirm; typed-confirm actions have a
 *      non-empty confirm string.
 *   4. Confirm strings are unique across the catalogue.
 *   5. `requiresTypedConfirm` matches the metadata's flag.
 *   6. `getSdkStatusForAction` returns the documented SDK mapping.
 *   7. `requiresCompanionDelete` matches the metadata's flag.
 */

import { describe, expect, it } from 'vitest';

import {
  REPORT_ACTIONS,
  REPORT_CONSUMER_ACTIONS,
  assertReportActionCatalogueHolds,
  getReportActionConfirmString,
  getReportActionMetadata,
  getSdkStatusForAction,
  isReportConsumerAction,
  requiresCompanionDelete,
  requiresTypedConfirm,
  type ReportConsumerAction,
} from '../action-enum';

describe('action-enum', () => {
  describe('REPORT_CONSUMER_ACTIONS', () => {
    it('lists the documented five actions', () => {
      expect([...REPORT_CONSUMER_ACTIONS]).toEqual([
        'dismiss',
        'acknowledge',
        'mark_resolved',
        'hide_review',
        'delete_review',
      ]);
    });
  });

  describe('isReportConsumerAction', () => {
    it('accepts every documented action', () => {
      for (const action of REPORT_CONSUMER_ACTIONS) {
        expect(isReportConsumerAction(action)).toBe(true);
      }
    });

    it('rejects unknown strings', () => {
      expect(isReportConsumerAction('unknown')).toBe(false);
      expect(isReportConsumerAction('resolve')).toBe(false);
      expect(isReportConsumerAction('')).toBe(false);
    });

    it('rejects non-string inputs', () => {
      expect(isReportConsumerAction(null)).toBe(false);
      expect(isReportConsumerAction(undefined)).toBe(false);
      expect(isReportConsumerAction(42)).toBe(false);
      expect(isReportConsumerAction({})).toBe(false);
    });
  });

  describe('REPORT_ACTIONS catalogue', () => {
    it('every documented action has metadata', () => {
      for (const action of REPORT_CONSUMER_ACTIONS) {
        expect(REPORT_ACTIONS[action]).toBeDefined();
        expect(REPORT_ACTIONS[action].label.length).toBeGreaterThan(0);
        expect(REPORT_ACTIONS[action].breadcrumbAction.length).toBeGreaterThan(0);
      }
    });

    it('non-destructive actions do not require typed confirm', () => {
      expect(REPORT_ACTIONS.dismiss.requiresTypedConfirm).toBe(false);
      expect(REPORT_ACTIONS.dismiss.confirmString).toBeNull();
      expect(REPORT_ACTIONS.acknowledge.requiresTypedConfirm).toBe(false);
      expect(REPORT_ACTIONS.acknowledge.confirmString).toBeNull();
      expect(REPORT_ACTIONS.mark_resolved.requiresTypedConfirm).toBe(false);
      expect(REPORT_ACTIONS.mark_resolved.confirmString).toBeNull();
    });

    it('destructive actions require typed confirm with a non-empty string', () => {
      expect(REPORT_ACTIONS.hide_review.requiresTypedConfirm).toBe(true);
      expect(REPORT_ACTIONS.hide_review.irreversible).toBe(true);
      expect(REPORT_ACTIONS.hide_review.confirmString).toBe('HIDE REVIEW');
      expect(REPORT_ACTIONS.delete_review.requiresTypedConfirm).toBe(true);
      expect(REPORT_ACTIONS.delete_review.irreversible).toBe(true);
      expect(REPORT_ACTIONS.delete_review.confirmString).toBe('DELETE REVIEW');
    });

    it('only delete_review requires the companion DELETE round-trip', () => {
      expect(requiresCompanionDelete('delete_review')).toBe(true);
      for (const action of REPORT_CONSUMER_ACTIONS) {
        if (action === 'delete_review') continue;
        expect(requiresCompanionDelete(action)).toBe(false);
      }
    });

    it('every irreversible action has a unique confirm string', () => {
      const seen = new Set<string>();
      for (const action of REPORT_CONSUMER_ACTIONS) {
        const confirm = REPORT_ACTIONS[action].confirmString;
        if (confirm === null) continue;
        expect(seen.has(confirm)).toBe(false);
        seen.add(confirm);
      }
    });

    it('every irreversible action is classified as destructive', () => {
      for (const action of REPORT_CONSUMER_ACTIONS) {
        const metadata = REPORT_ACTIONS[action];
        if (metadata.irreversible) {
          expect(metadata.auditActionType).toBe('destructive');
        } else {
          expect(metadata.auditActionType).toBe('non-destructive');
        }
      }
    });
  });

  describe('getReportActionMetadata', () => {
    it('returns the matching record for documented actions', () => {
      const metadata = getReportActionMetadata('dismiss');
      expect(metadata.label).toBe('Dismiss report');
      expect(metadata.sdkStatus).toBe('dismissed');
    });
  });

  describe('requiresTypedConfirm', () => {
    it('returns true for irreversible actions', () => {
      expect(requiresTypedConfirm('hide_review')).toBe(true);
      expect(requiresTypedConfirm('delete_review')).toBe(true);
    });

    it('returns false for non-destructive actions', () => {
      expect(requiresTypedConfirm('dismiss')).toBe(false);
      expect(requiresTypedConfirm('acknowledge')).toBe(false);
      expect(requiresTypedConfirm('mark_resolved')).toBe(false);
    });
  });

  describe('getReportActionConfirmString', () => {
    it('returns the typed-confirm string for irreversible actions', () => {
      expect(getReportActionConfirmString('hide_review')).toBe('HIDE REVIEW');
      expect(getReportActionConfirmString('delete_review')).toBe(
        'DELETE REVIEW',
      );
    });

    it('returns null for non-destructive actions', () => {
      expect(getReportActionConfirmString('dismiss')).toBeNull();
      expect(getReportActionConfirmString('acknowledge')).toBeNull();
      expect(getReportActionConfirmString('mark_resolved')).toBeNull();
    });
  });

  describe('getSdkStatusForAction', () => {
    it('maps documented actions to documented SDK statuses', () => {
      expect(getSdkStatusForAction('dismiss')).toBe('dismissed');
      expect(getSdkStatusForAction('acknowledge')).toBe('reviewed');
      expect(getSdkStatusForAction('mark_resolved')).toBe('reviewed');
      expect(getSdkStatusForAction('hide_review')).toBe('actioned');
      expect(getSdkStatusForAction('delete_review')).toBe('actioned');
    });
  });

  describe('assertReportActionCatalogueHolds', () => {
    it('does not throw on the documented catalogue', () => {
      expect(() => assertReportActionCatalogueHolds()).not.toThrow();
    });
  });

  describe('compile-time coverage', () => {
    // The exhaustive assignment below forces TypeScript to flag any
    // drift between `REPORT_CONSUMER_ACTIONS` and the consumer-facing
    // `ReportConsumerAction` union. If a new action is added to
    // either side this assignment surfaces the drift.
    it('every ReportConsumerAction has a metadata entry', () => {
      const all: readonly ReportConsumerAction[] = REPORT_CONSUMER_ACTIONS;
      expect(all.length).toBeGreaterThan(0);
      for (const action of all) {
        expect(REPORT_ACTIONS[action]).toBeDefined();
      }
    });
  });
});