export const PERMISSIONS = {
  review_report_read: "review_report_read",
  review_report_update: "review_report_update",

  comment_report_read: "comment_report_read",
  comment_report_update: "comment_report_update",
  comment_hide: "comment_hide",
  comment_restore: "comment_restore",

  tag_create: "tag_create",
  tag_update: "tag_update",
  tag_delete: "tag_delete",
  tag_restore: "tag_restore",

  category_create: "category_create",
  category_update: "category_update",
  category_delete: "category_delete",
  category_restore: "category_restore",

  ranking_recalculate: "ranking_recalculate",
  ranking_reset: "ranking_reset",
  ranking_consistency_check: "ranking_consistency_check",

  achievement_reevaluate: "achievement_reevaluate",
  achievement_badge_revoke: "achievement_badge_revoke",

  tournament_create: "tournament_create",
  tournament_update: "tournament_update",
  tournament_delete: "tournament_delete",

  user_grant_role: "user_grant_role",
  user_revoke_role: "user_revoke_role",

  audit_log_read: "audit_log_read",
} as const;

export type AdminPermission = keyof typeof PERMISSIONS;

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = Object.freeze(
  Object.keys(PERMISSIONS) as AdminPermission[],
);

export const ADMIN_PERMISSION_DESCRIPTIONS: Readonly<
  Record<AdminPermission, string>
> = Object.freeze({
  review_report_read: "View review moderation reports",
  review_report_update: "Update review moderation reports",
  comment_report_read: "View comment moderation reports",
  comment_report_update: "Update comment moderation reports",
  comment_hide: "Hide comments",
  comment_restore: "Restore hidden comments",
  tag_create: "Create tags",
  tag_update: "Update tags",
  tag_delete: "Delete tags",
  tag_restore: "Restore deleted tags",
  category_create: "Create categories",
  category_update: "Update categories",
  category_delete: "Delete categories",
  category_restore: "Restore deleted categories",
  ranking_recalculate: "Recalculate rankings",
  ranking_reset: "Reset ranking period",
  ranking_consistency_check: "Check ranking consistency",
  achievement_reevaluate: "Re-evaluate user achievements",
  achievement_badge_revoke: "Revoke badges from users",
  tournament_create: "Create tournaments",
  tournament_update: "Update tournaments",
  tournament_delete: "Delete tournaments",
  user_grant_role: "Grant roles to users",
  user_revoke_role: "Revoke roles from users",
  audit_log_read: "Inspect administrative audit logs",
});

export function getAdminPermissionLabel(name: AdminPermission): string {
  return name
    .split("_")
    .map((part) =>
      part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1),
    )
    .join(" ");
}

export function isAdminPermission(name: string): name is AdminPermission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, name);
}
