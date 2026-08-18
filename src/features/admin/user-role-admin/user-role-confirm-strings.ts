

import type { UserRoleGrantAction } from './user-role-admin-types';

export const USER_ROLE_GRANT_CONFIRM_KEY = 'role.grant';

export const USER_ROLE_REVOKE_CONFIRM_KEY = 'role.revoke';

export const USER_ROLE_GRANT_LABEL = 'Grant user role';

export const USER_ROLE_REVOKE_LABEL = 'Revoke user role';

export const USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE =
'Granting {role} to {username} is a privilege-escalation action. This cannot be undone without revoking the role.';

export const USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE =
'Revoking {role} from {username} will remove their elevated access. This cannot be undone without re-granting the role.';

export function formatGrantIrreversibilityNotice(
role: string,
username: string,
): string {
return USER_ROLE_GRANT_IRREVERSIBILITY_NOTICE_TEMPLATE.replace(
'{role}',
role,
  ).replace('{username}', username);
}

export function formatRevokeIrreversibilityNotice(
role: string,
username: string,
): string {
return USER_ROLE_REVOKE_IRREVERSIBILITY_NOTICE_TEMPLATE.replace(
'{role}',
role,
  ).replace('{username}', username);
}

export interface UserRoleConfirmMetadata {

key: string;

label: string;

irreversibilityNotice: string;
}

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
