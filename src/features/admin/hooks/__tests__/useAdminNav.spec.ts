/**
 * `features/admin/hooks/__tests__/useAdminNav.spec.ts`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.C2.
 */

import { describe, expect, it, vi } from 'vitest';

import { useAdminNav } from '../useAdminNav';
import type { AdminPermission } from '../../permissions';

vi.mock('../useAdminRole', () => ({
  useAdminRole: vi.fn(),
}));

import { useAdminRole } from '../useAdminRole';

function setRole(
  permissions: AdminPermission[],
  isLoading = false,
) {
  vi.mocked(useAdminRole).mockReturnValue({
    role: 'admin',
    permissions,
    isLoading,
    error: null,
  });
}

describe('useAdminNav', () => {
  // ── Loading ────────────────────────────────────────────────────────────────

  it('shows Dashboard while loading (no required permissions)', () => {
    setRole([], true);
    const result = useAdminNav();
    expect(result.isLoading).toBe(true);
    // Dashboard is always visible; other entries are filtered while loading
    const dashboardEntries = result.mainEntries.filter((e) => e.href === '/admin');
    expect(dashboardEntries).toHaveLength(1);
  });

  // ── Dashboard entry (always visible) ───────────────────────────────────

  it('always includes Dashboard when loaded', () => {
    setRole([]);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).toContain('/admin');
  });

  // ── Category / tag entries ──────────────────────────────────────────────

  it('shows Categories when any category permission is present', () => {
    setRole(['category_update']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).toContain('/admin/categories');
  });

  it('shows Tags when any tag permission is present', () => {
    setRole(['tag_delete']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).toContain('/admin/tags');
  });

  it('hides Categories when no category permission is present', () => {
    setRole(['tag_create']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).not.toContain('/admin/categories');
  });

  it('hides Tags when no tag permission is present', () => {
    setRole(['category_delete']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).not.toContain('/admin/tags');
  });

  // ── Users entry ─────────────────────────────────────────────────────────

  it('shows Users when user_grant_role is present', () => {
    setRole(['user_grant_role']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).toContain('/admin/users');
  });

  it('shows Users when user_revoke_role is present', () => {
    setRole(['user_revoke_role']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).toContain('/admin/users');
  });

  it('hides Users when neither grant nor revoke role is present', () => {
    setRole(['category_create', 'tag_create']);
    const result = useAdminNav();
    expect(result.mainEntries.map((e) => e.href)).not.toContain('/admin/users');
  });

  // ── Bottom entries ──────────────────────────────────────────────────────

  it('always includes Settings when loaded', () => {
    setRole([]);
    const result = useAdminNav();
    expect(result.bottomEntries.map((e) => e.href)).toContain('/admin/settings');
  });

  it('includes Roles & Permissions when user_grant_role is present', () => {
    setRole(['user_grant_role']);
    const result = useAdminNav();
    expect(result.bottomEntries.map((e) => e.href)).toContain('/admin/roles');
  });

  it('hides Roles & Permissions when user_grant_role is absent', () => {
    setRole(['tag_update']);
    const result = useAdminNav();
    expect(result.bottomEntries.map((e) => e.href)).not.toContain('/admin/roles');
  });

  // ── Bookmark restore is absent ───────────────────────────────────────────

  it('has no entry containing "bookmark" or "restore" in href or label', () => {
    setRole([
      'category_restore',
      'tag_restore',
      'comment_restore',
    ]);
    const result = useAdminNav();
    const allEntries = [...result.mainEntries, ...result.bottomEntries];
    for (const entry of allEntries) {
      expect(entry.href).not.toMatch(/bookmark/);
      expect(entry.label).not.toMatch(/bookmark/i);
      // restore in href is fine (tag_restore, etc.) but bookmark must not appear
    }
  });
});
