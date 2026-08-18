

export const ADMIN_ENDPOINTS = [

'GET /reviews/reports',
'PATCH /reviews/reports/:reportId',

'GET /comments/reports',
'PATCH /comments/reports/:reportId',
'POST /comments/:commentId/hide',
'POST /comments/:commentId/restore',

'POST /tags',
'PATCH /tags/:id',
'DELETE /tags/:id',
'POST /tags/:id/restore',

'POST /categories',
'PATCH /categories/:id',
'DELETE /categories/:id',
'POST /categories/:id/restore',

'POST /rankings/admin/recalculate',
'POST /rankings/admin/reset',
'POST /rankings/admin/consistency-check',

'POST /achievements/admin/users/:userId/reevaluate',
'DELETE /achievements/admin/users/:userId/badges/:badgeId',

'POST /tournaments',
'PATCH /tournaments/:id',
'DELETE /tournaments/:id',

'POST /admin/users/:userId/roles',

'GET /admin/audit',
'GET /admin/audit/:entryId',
] as const;

export type AdminEndpoint = (typeof ADMIN_ENDPOINTS)[number];

export type IrreversibleAdminOperation =
| 'ranking.recalculate'
  | 'ranking.reset'
  | 'tournament.delete'
  | 'role.revoke'
  | 'role.grant'
  // TKT-7.5.B2 — review-moderation irreversible operations. The
  // `hide_review` action hides the offending review from public
  // surfaces; the `delete_review` action removes it permanently.
  // Both surface a typed-confirm dialog before the destructive PATCH
  // / DELETE is dispatched. Confirm strings satisfy the documented
  // invariants (minLength 8, uppercase, whitespace-significant,
  // non-trivial) and are unique within this catalogue.
  | 'review.hide'
  | 'review.delete'
  // TKT-7.8.B3 — achievement admin badge revoke. Irreversibly removes
  // a granted badge from a user. The confirm string satisfies the documented
  // invariants (minLength 8, uppercase, whitespace-significant, non-trivial).
  | 'achievement.badge_revoke';

export const IRREVERSIBLE_OPERATIONS: ReadonlyArray<{
readonly operation: IrreversibleAdminOperation;
readonly confirmString: string;
readonly backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED';
}> = [
{
operation: 'ranking.recalculate',
confirmString: 'RECALCULATE RANKINGS',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'ranking.reset',
confirmString: 'RESET RANKING PERIOD',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'tournament.delete',
confirmString: 'DELETE TOURNAMENT',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'role.revoke',
confirmString: 'REVOKE ROLE',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'role.grant',
confirmString: 'GRANT ROLE',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'review.hide',
confirmString: 'HIDE REVIEW',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
{
operation: 'review.delete',
confirmString: 'DELETE REVIEW',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },

{
operation: 'achievement.badge_revoke',
confirmString: 'REVOKE BADGE',
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
] as const;

export const AUDIT_LOG_EXPOSED: boolean = false;

export function getIrreversibleConfirmString(
operation: IrreversibleAdminOperation,
): string | null {
const entry = IRREVERSIBLE_OPERATIONS.find((e) => e.operation === operation);
return entry ? entry.confirmString : null;
}
