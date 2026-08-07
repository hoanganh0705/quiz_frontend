/**
 * `features/admin/user-role-admin/user-role-confirm-strings.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.B2.
 *
 * ## What this module owns
 *
 * The user-role-admin-specific typed-confirm vocabulary. This module maps
 * the confirm-string keys from `IRREVERSIBLE_OPERATIONS` to their display
 * labels and irreversibility notices. This module is the single source of
 * truth for which user role operations require typed-confirm and what the
 * confirm strings are.
 */

import type { UserRoleGrantAction } from './user-role-admin-types';

/**
 * Confirm string key for role grant.
 * References `IRREVERSIBLE_OPERATIONS` entry: `role.grant` → `'GRANT ROLE'`
 */
export const USER_ROLE_GRANT_CONFIRM_KEY = 'role.grant';

/**
 * Confirm string key for role revoke.
 * References `IRREVERSIBLE_OPERATIONS` entry: `role.revoke` → `'REVOKE ROLE'`
 */
export const USER_ROLE_REVOKE_CONFIRM_KEY = 'role.revoke';

/**
 * Display label for the grant confirm dialog header.
 */
export const USER_ROLE_GRANT_LABEL = 'Grant user role';

/**
 * Display label for the revoke confirm dialog header.
 */
export const USER_ROLE_REVOKE_LABEL = 'Revoke user role';

/**
 * Irreversibility notice for role grant.
 * Contains placeholders for the role and username.
 */
export const USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE =
  'Granting {role} to {username} is a privilege-escalation action. This cannot be undone without revoking the role.';

/**
 * Irreversibility notice for role revoke.
 * Contains placeholders for the role and username.
 */
export const USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE =
  'Revoking {role} from {username} will remove their elevated access. This cannot be undone without re-granting the role.';

/**
 * Fill in the placeholders in the grant irreversibility notice.
 */
export function formatGrantIrreversibilityNotice(
  role: string,
  username: string,
): string {
  return USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE.replace(
    '{role}',
    role,
  ).replace('{username}', username);
}

/**
 * Fill in the placeholders in the revoke irreversibility notice.
 */
export function formatRevokeIrreversibilityNotice(
  role: string,
  username: string,
): string {
  return USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE.replace(
    '{role}',
    role,
  ).replace('{username}', username);
}

/**
 * Metadata for a user role confirm action.
 */
export interface UserRoleConfirmMetadata {
  /** The confirm key referencing `IRREVERSIBLE_OPERATIONS`. */
  key: string;
  /** Display label for the dialog header. */
  label: string;
  /** Irreversibility notice with placeholders filled. */
  irreversibilityNotice: string;
}

/**
 * Get the confirm metadata for a user role action.
 *
 * @param action - The action ('grant' or 'revoke')
 * @param role - The role name for the notice placeholder
 * @param username - The username for the notice placeholder
 */
export function getUserRoleConfirmMetadata(
  action: UserRoleGrantAction,
  role: string,
  username: string,
): UserRoleConfirmMetadata {
  if (action === 'grant') {
    return {
      key: USER_ROLE_GRANT_CONFIRM_KEY,
      label: USER_ROLE_GRANT_LABEL,
      irreversibilityNotice: formatGrantIrreversibilityNotice(role, username),
    };
  }
  return {
    key: USER_ROLE_REVOKE_CONFIRM_KEY,
    label: USER_ROLE_REVOKE_LABEL,
    irreversibilityNotice: formatRevokeIrreversibilityNotice(role, username),
  };
}
