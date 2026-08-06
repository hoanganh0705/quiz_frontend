/**
 * `features/admin/permissions.ts`
 *
 * Source epic:   Epic 7.1 — Phase 7 SDK coverage, `usePermission` selector,
 *                 admin role guard, typed-confirm dialog, and audit-aware
 *                 action primitives.
 * Source ticket: TKT-7.1.A4.
 *
 * ## What this module owns
 *
 * The single typed `PERMISSIONS` map for Phase 7 admin permissions. Every
 * admin UI surface (`useAdminUsersTable`, `useModerationQueue`,
 * `<TagAdminForm>`, `<RoleGrantDialog>`, etc.) gates on a permission name
 * from this map via `usePermission(name)` (TKT-7.1.B2). The map is the
 * source of truth for the typed union `AdminPermission`.
 *
 * ## Source of truth
 *
 * The names mirror the documented Phase 7 permissions in the master plan
 * Phase 7 §Required Endpoints lines 475–483. The backend stores these
 * permission names on the admin user's role document; the slim `/auth/me`
 * payload exposes only the role slug (e.g. `'admin'`, `'moderator'`), so
 * the runtime mapper (TKT-7.1.D3) resolves the documented permissions
 * from the slug. This module owns only the names and labels; the slug
 * mapping is in `useAdminRole` (TKT-7.1.B3).
 *
 * ## Adding a new permission
 *
 *   1. Add the snake_case string to the `PERMISSIONS` constant below.
 *   2. Add the matching union member to `AdminPermission` (compile-time
 *      check on every consumer).
 *   3. Add a label via `getAdminPermissionLabel(name)` automatically.
 *
 * The co-located spec locks structural invariants.
 */

export const PERMISSIONS = {
  // Review moderation (Story 7.5)
  review_report_read: 'review_report_read',
  review_report_update: 'review_report_update',

  // Comment moderation (Story 7.6)
  comment_report_read: 'comment_report_read',
  comment_report_update: 'comment_report_update',
  comment_hide: 'comment_hide',
  comment_restore: 'comment_restore',

  // Tag admin (Story 7.3)
  tag_create: 'tag_create',
  tag_update: 'tag_update',
  tag_delete: 'tag_delete',
  tag_restore: 'tag_restore',

  // Category admin (Story 7.4)
  category_create: 'category_create',
  category_update: 'category_update',
  category_delete: 'category_delete',
  category_restore: 'category_restore',

  // Ranking admin (Story 7.9)
  ranking_recalculate: 'ranking_recalculate',
  ranking_reset: 'ranking_reset',
  ranking_consistency_check: 'ranking_consistency_check',

  // Achievement admin (Story 7.8)
  achievement_reevaluate: 'achievement_reevaluate',
  achievement_badge_revoke: 'achievement_badge_revoke',

  // Tournament admin (Story 7.7)
  tournament_create: 'tournament_create',
  tournament_update: 'tournament_update',
  tournament_delete: 'tournament_delete',

  // User-role grant (Story 7.10) — privileged; requires `USER_GRANT_ROLE`.
  user_grant_role: 'user_grant_role',
  user_revoke_role: 'user_revoke_role',
} as const;

export type AdminPermission = keyof typeof PERMISSIONS;

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = Object.freeze(
  Object.keys(PERMISSIONS) as AdminPermission[],
);

/**
 * Look up the label for a permission. The label is a deterministic Title
 * Case rendering of the snake_case name. The catalogued labels are the
 * canonical copy surfaces; future i18n hooks can replace this with a
 * localized lookup without changing call sites.
 *
 * @example
 *   getAdminPermissionLabel('ranking_reset') // 'Ranking Reset'
 */
export function getAdminPermissionLabel(name: AdminPermission): string {
  return name
    .split('_')
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(' ');
}

/**
 * Type guard. Narrows an unknown string to a documented
 * `AdminPermission`. Useful for runtime validation of role-mapping
 * lookups.
 */
export function isAdminPermission(name: string): name is AdminPermission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, name);
}
