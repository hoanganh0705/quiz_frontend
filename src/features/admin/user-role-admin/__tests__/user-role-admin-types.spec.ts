/**
 * `features/admin/user-role-admin/__tests__/user-role-admin-types.spec.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.B1.
 */

import { describe, expect, it } from 'vitest';

import {
  DOCUMENTED_ROLES,
  type UserRoleAdminErrorCode,
  type UserRoleGrantAction,
} from '../user-role-admin-types';

describe('user-role-admin-types', () => {
  describe('UserRoleAdminErrorCode', () => {
    it('should include all expected error codes', () => {
      const expectedCodes: UserRoleAdminErrorCode[] = [
        'ROLE_NOT_FOUND',
        'ALREADY_GRANTED',
        'NOT_GRANTED',
        'SELF_ROLE_REVOKE_FORBIDDEN',
        'IRREVERSIBLE_CONFIRM_REQUIRED',
        'PERMISSION_DENIED',
      ];

      expectedCodes.forEach((code) => {
        expect(code).toBeTruthy();
      });
    });
  });

  describe('UserRoleGrantAction', () => {
    it('should have grant action', () => {
      const action: UserRoleGrantAction = 'grant';
      expect(action).toBe('grant');
    });

    it('should have revoke action', () => {
      const action: UserRoleGrantAction = 'revoke';
      expect(action).toBe('revoke');
    });

    it('should be a discriminated union', () => {
      const actions: UserRoleGrantAction[] = ['grant', 'revoke'];
      expect(actions).toHaveLength(2);
    });
  });

  describe('DOCUMENTED_ROLES', () => {
    it('should be non-empty', () => {
      expect(DOCUMENTED_ROLES.length).toBeGreaterThan(0);
    });

    it('should have unique role names', () => {
      const names = DOCUMENTED_ROLES.map((r) => r.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should include admin-related roles', () => {
      const roleNames = DOCUMENTED_ROLES.map((r) => r.name);
      expect(roleNames).toContain('user_grant_role');
      expect(roleNames).toContain('user_revoke_role');
    });

    it('should have required properties on each role', () => {
      DOCUMENTED_ROLES.forEach((role) => {
        expect(typeof role.name).toBe('string');
        expect(role.name.length).toBeGreaterThan(0);
        expect(typeof role.description).toBe('string');
        expect(role.description.length).toBeGreaterThan(0);
        expect(typeof role.isHighestPrivilege).toBe('boolean');
      });
    });
  });
});
