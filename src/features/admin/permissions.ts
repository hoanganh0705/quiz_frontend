

export const PERMISSIONS = {

review_report_read: 'review_report_read',
review_report_update: 'review_report_update',

comment_report_read: 'comment_report_read',
comment_report_update: 'comment_report_update',
comment_hide: 'comment_hide',
comment_restore: 'comment_restore',

tag_create: 'tag_create',
tag_update: 'tag_update',
tag_delete: 'tag_delete',
tag_restore: 'tag_restore',

category_create: 'category_create',
category_update: 'category_update',
category_delete: 'category_delete',
category_restore: 'category_restore',

ranking_recalculate: 'ranking_recalculate',
ranking_reset: 'ranking_reset',
ranking_consistency_check: 'ranking_consistency_check',

achievement_reevaluate: 'achievement_reevaluate',
achievement_badge_revoke: 'achievement_badge_revoke',

tournament_create: 'tournament_create',
tournament_update: 'tournament_update',
tournament_delete: 'tournament_delete',

user_grant_role: 'user_grant_role',
user_revoke_role: 'user_revoke_role',

audit_log_read: 'audit_log_read',
} as const;

export type AdminPermission = keyof typeof PERMISSIONS;

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = Object.freeze(
Object.keys(PERMISSIONS) as AdminPermission[],
);

export function getAdminPermissionLabel(name: AdminPermission): string {
return name
    .split('_')
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(' ');
}

export function isAdminPermission(name: string): name is AdminPermission {
return Object.prototype.hasOwnProperty.call(PERMISSIONS, name);
}
