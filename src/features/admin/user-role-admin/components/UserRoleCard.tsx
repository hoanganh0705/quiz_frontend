'use client';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';
import { User as UserIcon } from 'lucide-react';

import { usePermission } from '@/features/admin/hooks/usePermission';
import type { AdminPermission } from '@/features/admin/services/user-role-admin.service';

import { GrantRoleDialog } from './GrantRoleDialog';
import { RevokeRoleDialog } from './RevokeRoleDialog';
import { useUserRoles } from '../hooks/useUserRoles';
import type { UserSearchResultDto } from '../user-role-admin-types';

export interface UserRoleCardProps {

user: UserSearchResultDto;

onChanged?: () => void;
}

export function UserRoleCard({
user,
onChanged,
}: UserRoleCardProps): React.ReactElement {
const [grantOpen, setGrantOpen] = useState(false);
const [revokeTarget, setRevokeTarget] = useState<AdminPermission | null>(
null,
  );

const { roles, isLoading } = useUserRoles(user.userId);
const { hasPermission: canGrant } = usePermission('user_grant_role');

const handleRevokeClick = useCallback((role: AdminPermission) => {
setRevokeTarget(role);
  }, []);

const handleRevokeClose = useCallback(() => {
setRevokeTarget(null);
  }, []);

const handleGrantClose = useCallback(() => {
setGrantOpen(false);
  }, []);

const handleChanged = useCallback(() => {
onChanged?.();
  }, [onChanged]);

const truncatedId = useMemo(() => {
if (user.userId.length <= 12) return user.userId;
return `${user.userId.slice(0, 8)}...${user.userId.slice(-4)}`;
  }, [user.userId]);

return (
<div
className="flex h-full flex-col rounded-md border bg-card p-6"
data-testid="user-role-card"
    >
{/* User header */}
<div className="flex items-start gap-4 border-b pb-4">
<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
{user.avatar ? (
<img
src={user.avatar}
alt={user.username}
className="h-full w-full object-cover"
            />
          ) : (
<UserIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          )}
</div>
<div className="min-w-0 flex-1">
<p
className="truncate text-base font-semibold"
data-testid="user-role-card-username"
          >
{user.username}
</p>
<p
className="truncate text-sm text-muted-foreground"
data-testid="user-role-card-email"
          >
{user.email}
</p>
<p
className="mt-0.5 font-mono text-xs text-muted-foreground"
data-testid="user-role-card-userid"
          >
ID: {truncatedId}
</p>
</div>
</div>

{/* Role list */}
<div className="mt-4 flex-1 overflow-y-auto">
<h3 className="mb-2 text-sm font-medium">Current Roles</h3>
{isLoading ? (
<div
className="space-y-2"
data-testid="user-role-card-skeleton"
          >
<LoadingSpinner size="sm" />
<p className="text-xs text-muted-foreground">Loading roles…</p>
</div>
        ) : roles.length === 0 ? (
<p
className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground"
data-testid="user-role-card-empty"
          >
This user has no roles.
          </p>
        ) : (
<ul
className="space-y-2"
data-testid="user-role-card-list"
          >
{roles.map((role) => (
<li
key={role.role}
className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
data-testid="user-role-card-role-row"
data-role-name={role.role}
              >
<div className="min-w-0 flex-1">
<p className="truncate text-sm font-medium">{role.role}</p>
<p className="text-xs text-muted-foreground">
Granted at:{' '}
{new Date(role.grantedAt).toLocaleString()}
</p>
</div>
{canGrant && (
<Button
variant="outline"
size="sm"
onClick={() => handleRevokeClick(role.role)}
data-testid="user-role-card-revoke-button"
                  >
Revoke
                  </Button>
                )}
</li>
            ))}
</ul>
        )}
</div>

{/* Grant Role button */}
{canGrant && (
<div className="mt-4 border-t pt-4">
<Button
variant="default"
onClick={() => setGrantOpen(true)}
className="w-full"
data-testid="user-role-card-grant-button"
          >
Grant Role
          </Button>
</div>
      )}

{/* Dialogs */}
<GrantRoleDialog
userId={user.userId}
username={user.username}
isOpen={grantOpen}
onClose={handleGrantClose}
onSuccess={handleChanged}
      />
{revokeTarget !== null && (
<RevokeRoleDialog
userId={user.userId}
username={user.username}
currentRoles={roles}
role={revokeTarget}
isOpen={true}
onClose={handleRevokeClose}
onSuccess={handleChanged}
        />
      )}
</div>
  );
}
