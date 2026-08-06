import { describe, expect, it } from 'vitest';

import {
  ADMIN_ENDPOINTS,
  AUDIT_LOG_EXPOSED,
  IRREVERSIBLE_OPERATIONS,
  getIrreversibleConfirmString,
} from '../admin-capabilities';

describe('admin-capabilities — Phase 7 capability catalogue', () => {
  it('(1) ADMIN_ENDPOINTS is a non-empty readonly list covering every Phase 7 endpoint', () => {
    expect(ADMIN_ENDPOINTS.length).toBeGreaterThan(0);
    // A small sampling of the documented endpoints — keeps the spec
    // tolerant to future additions while still locking the structural
    // invariant.
    expect(ADMIN_ENDPOINTS).toContain('GET /reviews/reports');
    expect(ADMIN_ENDPOINTS).toContain('POST /tags');
    expect(ADMIN_ENDPOINTS).toContain('POST /categories/:id/restore');
    expect(ADMIN_ENDPOINTS).toContain('POST /rankings/admin/recalculate');
    expect(ADMIN_ENDPOINTS).toContain('DELETE /achievements/admin/users/:userId/badges/:badgeId');
    expect(ADMIN_ENDPOINTS).toContain('DELETE /tournaments/:id');
    expect(ADMIN_ENDPOINTS).toContain('POST /admin/users/:userId/roles');
  });

  it('(2) IRREVERSIBLE_OPERATIONS is non-empty and every entry has a non-empty confirmString', () => {
    expect(IRREVERSIBLE_OPERATIONS.length).toBeGreaterThan(0);
    for (const entry of IRREVERSIBLE_OPERATIONS) {
      expect(entry.confirmString.length).toBeGreaterThan(0);
      expect(entry.backendCode).toBe('IRREVERSIBLE_CONFIRM_REQUIRED');
    }
  });

  it('(3) getIrreversibleConfirmString returns the catalogued string for documented operations', () => {
    expect(getIrreversibleConfirmString('ranking.reset')).toBe(
      'RESET RANKING PERIOD',
    );
    expect(getIrreversibleConfirmString('role.revoke')).toBe('REVOKE ROLE');
  });

  it('AUDIT_LOG_EXPOSED is a boolean (defaults to false)', () => {
    expect(typeof AUDIT_LOG_EXPOSED).toBe('boolean');
    expect(AUDIT_LOG_EXPOSED).toBe(false);
  });
});
