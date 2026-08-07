/**
 * `features/admin/user-role-admin/__tests__/user-role-confirm-strings.spec.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.B2.
 */

import { describe, expect, it } from 'vitest';

import {
  USER_ROLE_GRANT_CONFIRM_KEY,
  USER_ROLE_REVOKE_CONFIRM_KEY,
  USER_ROLE_GRANT_LABEL,
  USER_ROLE_REVOKE_LABEL,
  USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE,
  USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE,
  formatGrantIrreversibilityNotice,
  formatRevokeIrreversibilityNotice,
  getUserRoleConfirmMetadata,
} from '../user-role-confirm-strings';

describe('user-role-confirm-strings', () => {
  describe('confirm keys', () => {
    it('should have non-empty grant confirm key', () => {
      expect(USER_ROLE_GRANT_CONFIRM_KEY).toBeTruthy();
      expect(USER_ROLE_GRANT_CONFIRM_KEY.length).toBeGreaterThan(0);
    });

    it('should have non-empty revoke confirm key', () => {
      expect(USER_ROLE_REVOKE_CONFIRM_KEY).toBeTruthy();
      expect(USER_ROLE_REVOKE_CONFIRM_KEY.length).toBeGreaterThan(0);
    });

    it('should have distinct keys', () => {
      expect(USER_ROLE_GRANT_CONFIRM_KEY).not.toBe(USER_ROLE_REVOKE_CONFIRM_KEY);
    });
  });

  describe('labels', () => {
    it('should have non-empty grant label', () => {
      expect(USER_ROLE_GRANT_LABEL).toBeTruthy();
      expect(USER_ROLE_GRANT_LABEL.length).toBeGreaterThan(0);
    });

    it('should have non-empty revoke label', () => {
      expect(USER_ROLE_REVOKE_LABEL).toBeTruthy();
      expect(USER_ROLE_REVOKE_LABEL.length).toBeGreaterThan(0);
    });
  });

  describe('irreversibility notices', () => {
    it('should mention privilege escalation in grant notice', () => {
      expect(USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE).toContain(
        'privilege',
      );
    });

    it('should mention cannot be undone in grant notice', () => {
      expect(USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE).toContain(
        'cannot be undone',
      );
    });

    it('should mention elevated access in revoke notice', () => {
      expect(USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE).toContain(
        'elevated access',
      );
    });

    it('should mention cannot be undone in revoke notice', () => {
      expect(USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE).toContain(
        'cannot be undone',
      );
    });
  });

  describe('formatGrantIrreversibilityNotice', () => {
    it('should replace placeholders', () => {
      const notice = formatGrantIrreversibilityNotice('admin', 'johndoe');
      expect(notice).toContain('admin');
      expect(notice).toContain('johndoe');
      expect(notice).not.toContain('{role}');
      expect(notice).not.toContain('{username}');
    });
  });

  describe('formatRevokeIrreversibilityNotice', () => {
    it('should replace placeholders', () => {
      const notice = formatRevokeIrreversibilityNotice('admin', 'johndoe');
      expect(notice).toContain('admin');
      expect(notice).toContain('johndoe');
      expect(notice).not.toContain('{role}');
      expect(notice).not.toContain('{username}');
    });
  });

  describe('getUserRoleConfirmMetadata', () => {
    it('should return correct metadata for grant action', () => {
      const metadata = getUserRoleConfirmMetadata('grant', 'admin', 'johndoe');
      expect(metadata.key).toBe(USER_ROLE_GRANT_CONFIRM_KEY);
      expect(metadata.label).toBe(USER_ROLE_GRANT_LABEL);
      expect(metadata.irreversibilityNotice).toContain('admin');
      expect(metadata.irreversibilityNotice).toContain('johndoe');
    });

    it('should return correct metadata for revoke action', () => {
      const metadata = getUserRoleConfirmMetadata('revoke', 'admin', 'johndoe');
      expect(metadata.key).toBe(USER_ROLE_REVOKE_CONFIRM_KEY);
      expect(metadata.label).toBe(USER_ROLE_REVOKE_LABEL);
      expect(metadata.irreversibilityNotice).toContain('admin');
      expect(metadata.irreversibilityNotice).toContain('johndoe');
    });
  });
});
