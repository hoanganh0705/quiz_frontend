import { describe, expect, it } from 'vitest';

import {
ADMIN_PERMISSIONS,
getAdminPermissionLabel,
isAdminPermission,
PERMISSIONS,
} from '../permissions';

describe('admin/permissions — Phase 7 typed PERMISSIONS map (TKT-7.1.A4)', () => {
it('(1) PERMISSIONS contains every documented Phase 7 admin permission', () => {
expect(PERMISSIONS.review_report_read).toBe('review_report_read');
expect(PERMISSIONS.comment_hide).toBe('comment_hide');
expect(PERMISSIONS.tag_create).toBe('tag_create');
expect(PERMISSIONS.category_restore).toBe('category_restore');
expect(PERMISSIONS.ranking_recalculate).toBe('ranking_recalculate');
expect(PERMISSIONS.achievement_badge_revoke).toBe('achievement_badge_revoke');
expect(PERMISSIONS.tournament_delete).toBe('tournament_delete');
expect(PERMISSIONS.user_grant_role).toBe('user_grant_role');
  });

it('(2) ADMIN_PERMISSIONS includes every key from PERMISSIONS', () => {
expect(ADMIN_PERMISSIONS).toContain('review_report_read');
expect(ADMIN_PERMISSIONS).toContain('user_grant_role');
expect(ADMIN_PERMISSIONS.length).toBe(Object.keys(PERMISSIONS).length);
  });

it('(3) getAdminPermissionLabel renders Title Case copy', () => {
expect(getAdminPermissionLabel('ranking_reset')).toBe('Ranking Reset');
expect(getAdminPermissionLabel('user_grant_role')).toBe('User Grant Role');
  });

it('(4) isAdminPermission narrows correctly', () => {
expect(isAdminPermission('ranking_reset')).toBe(true);
expect(isAdminPermission('not_a_real_permission')).toBe(false);
  });
});
