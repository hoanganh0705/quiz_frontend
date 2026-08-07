/**
 * `features/admin/user-role-admin/components/SelfRoleRevokeForbiddenNotice.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E4.
 *
 * ## What this component renders
 *
 * A prominent, non-dismissable notice explaining why the admin cannot
 * revoke their own admin role.
 */

import { ShieldAlert } from 'lucide-react';

export interface SelfRoleRevokeForbiddenNoticeProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * Prominent notice for self-revocation protection.
 */
export function SelfRoleRevokeForbiddenNotice({
  className,
}: SelfRoleRevokeForbiddenNoticeProps): React.ReactElement {
  return (
    <div
      className={`
        flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4
        ${className ?? ''}
      `}
      data-testid="self-role-revoke-forbidden-notice"
      role="alert"
      aria-live="polite"
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-destructive">
          You cannot revoke your own role
        </p>
        <p className="text-sm text-destructive/80">
          Revoking your own admin role would remove your administrative access.
          This action is forbidden by server policy for security reasons.
        </p>
      </div>
    </div>
  );
}
