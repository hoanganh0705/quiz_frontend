'use client';

import { useCallback, useState } from 'react';

import {
AlertDialog,
AlertDialogContent,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { ShieldAlert } from 'lucide-react';

import { getUserCopy } from '@/lib/api/error-codes';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import { TypedConfirmDialog } from '@/features/admin/components/TypedConfirmDialog';
import { useAuth } from '@/features/auth/hooks/use-auth';

import { useRevokeUserRole } from '../hooks/useRevokeUserRole';
import { SelfRoleRevokeForbiddenNotice } from './SelfRoleRevokeForbiddenNotice';
import {
type AdminPermission,
type UserRoleDto,
} from '@/features/admin/services/user-role-admin.service';
import { getUserRoleConfirmMetadata } from '../user-role-confirm-strings';

export interface RevokeRoleDialogProps {

userId: string;

username: string;

currentRoles: readonly UserRoleDto[];

role: AdminPermission;

isOpen: boolean;

onClose: () => void;

onSuccess: () => void;
}

export function RevokeRoleDialog({
userId,
username,
currentRoles,
role,
isOpen,
onClose,
onSuccess,
}: RevokeRoleDialogProps): React.ReactElement | null {
const [showTypedConfirm, setShowTypedConfirm] = useState(false);

const { revoke, isPending, error, reset } = useRevokeUserRole();
const auth = useAuth();
const currentUserId = auth?.currentUser?.userId ?? null;

const isSelfRevoke = currentUserId !== null && userId === currentUserId;

const handleRevokeClick = useCallback(() => {
if (!isSelfRevoke) {
setShowTypedConfirm(true);
    }
  }, [isSelfRevoke]);

const handleTypedConfirm = useCallback(async () => {
try {
await revoke(userId, role);
setShowTypedConfirm(false);
onSuccess();
onClose();
reset();
    } catch {
setShowTypedConfirm(false);
    }
  }, [revoke, userId, role, onSuccess, onClose, reset]);

const handleCancel = useCallback(() => {
if (isPending) return;
setShowTypedConfirm(false);
reset();
onClose();
  }, [isPending, reset, onClose]);

const handleTypedCancel = useCallback(() => {
setShowTypedConfirm(false);
  }, []);

const metadata = getUserRoleConfirmMetadata('revoke', role, username);

const roleEntry = currentRoles.find((r) => r.role === role);

if (!isOpen) return null;

return (
<>
<AlertDialog
open={isOpen && !showTypedConfirm}
onOpenChange={(next) => {
if (!next) handleCancel();
        }}
      >
<AlertDialogContent data-testid="revoke-role-dialog">
<AlertDialogHeader>
<AlertDialogTitle data-testid="revoke-role-dialog-title">
Revoke role from {username}
</AlertDialogTitle>
</AlertDialogHeader>

{/* Self-revocation notice */}
{isSelfRevoke && <SelfRoleRevokeForbiddenNotice />}

{/* Error notice */}
{error !== null && !isSelfRevoke && (
<div
role="alert"
aria-live="polite"
className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
data-testid="revoke-error-notice"
data-error-code={error.code}
            >
<p className="font-medium text-destructive">
{getUserCopy(error.code).title}
</p>
<p className="mt-1 text-destructive/80">
{getUserCopy(error.code).body}
</p>
</div>
          )}

{/* RequestIdBanner */}
{error !== null && !isSelfRevoke && error.requestId.length > 0 ? (
<RequestIdBanner error={error} />
          ) : null}

{/* Role display */}
<div
className="rounded-md border bg-muted/40 p-3"
data-testid="revoke-role-display"
          >
<p className="text-sm font-medium">{role}</p>
{roleEntry?.grantedAt && (
<p className="mt-1 text-xs text-muted-foreground">
Granted at: {new Date(roleEntry.grantedAt).toLocaleString()}
</p>
            )}
</div>

{/* Privilege escalation warning */}
{!isSelfRevoke && (
<div
className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3"
data-testid="revoke-privilege-escalation-warning"
            >
<ShieldAlert
aria-hidden="true"
className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              />
<p className="text-xs text-amber-900">
{metadata.irreversibilityNotice}
</p>
</div>
          )}

<AlertDialogFooter>
<Button
variant="ghost"
onClick={handleCancel}
disabled={isPending}
data-testid="revoke-cancel-button"
            >
Cancel
            </Button>
<Button
variant="destructive"
disabled={isSelfRevoke || isPending}
onClick={handleRevokeClick}
data-testid="revoke-confirm-button"
            >
Revoke Role
            </Button>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>

{/* Typed confirm dialog */}
{!isSelfRevoke && (
<TypedConfirmDialog
open={showTypedConfirm}
operation="role.revoke"
onConfirm={() => void handleTypedConfirm()}
onCancel={handleTypedCancel}
pending={isPending}
previousError={error}
        />
      )}
</>
  );
}
