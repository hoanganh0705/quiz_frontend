'use client';

/**
 * `features/admin/user-role-admin/components/GrantRoleDialog.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E2.
 *
 * ## What this component renders
 *
 * The grant role dialog with:
 *   - RoleSetPicker for selecting the role to grant
 *   - Privilege-escalation warning
 *   - Standard "Grant Role" button
 *   - TypedConfirmDialog for the secondary confirm
 *   - Error notice + RequestIdBanner on failure
 */

import { useCallback, useState } from 'react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import { TypedConfirmDialog } from '@/features/admin/components/TypedConfirmDialog';

import { useGrantUserRole } from '../hooks/useGrantUserRole';
import { RoleSetPicker } from './RoleSetPicker';
import type { DocumentedRole } from '../user-role-admin-types';
import { getUserRoleConfirmMetadata } from '../user-role-confirm-strings';

export interface GrantRoleDialogProps {
  /** The user ID to grant the role to */
  userId: string;
  /** The username for display */
  username: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** Called after a successful grant */
  onSuccess: () => void;
}

/**
 * Grant role dialog with secondary confirm.
 */
export function GrantRoleDialog({
  userId,
  username,
  isOpen,
  onClose,
  onSuccess,
}: GrantRoleDialogProps): React.ReactElement | null {
  const [selectedRole, setSelectedRole] = useState<DocumentedRole | null>(null);
  const [showTypedConfirm, setShowTypedConfirm] = useState(false);

  const { grant, isPending, error, reset } = useGrantUserRole();

  const handleRoleSelect = useCallback((role: DocumentedRole) => {
    setSelectedRole(role);
  }, []);

  const handleGrantClick = useCallback(() => {
    if (selectedRole !== null) {
      setShowTypedConfirm(true);
    }
  }, [selectedRole]);

  const handleTypedConfirm = useCallback(async () => {
    if (selectedRole === null) return;

    try {
      await grant(userId, selectedRole.name);
      setSelectedRole(null);
      setShowTypedConfirm(false);
      onSuccess();
      onClose();
      reset();
    } catch {
      // Error is captured in hook state via requestIdBanner
      setShowTypedConfirm(false);
    }
  }, [grant, userId, selectedRole, onSuccess, onClose, reset]);

  const handleCancel = useCallback(() => {
    if (isPending) return;
    setSelectedRole(null);
    setShowTypedConfirm(false);
    reset();
    onClose();
  }, [isPending, reset, onClose]);

  const handleTypedCancel = useCallback(() => {
    setShowTypedConfirm(false);
  }, []);

  // Get notice text for the selected role
  const metadata = selectedRole
    ? getUserRoleConfirmMetadata('grant', selectedRole.name, username)
    : null;

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog
        open={isOpen && !showTypedConfirm}
        onOpenChange={(next) => {
          if (!next) handleCancel();
        }}
      >
        <AlertDialogContent data-testid="grant-role-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="grant-role-dialog-title">
              Grant role to {username}
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* Error notice */}
          {error !== null && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
              data-testid="grant-error-notice"
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
          {error !== null && error.requestId.length > 0 ? (
            <RequestIdBanner error={error} />
          ) : null}

          {/* Role picker */}
          <div className="max-h-72 overflow-y-auto">
            <RoleSetPicker
              selectedRole={selectedRole?.name ?? null}
              onSelect={handleRoleSelect}
              disabled={isPending}
            />
          </div>

          {/* Privilege escalation warning */}
          {selectedRole !== null && (
            <div
              className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3"
              data-testid="grant-privilege-escalation-warning"
            >
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              />
              <p className="text-xs text-amber-900">
                {metadata?.irreversibilityNotice}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              data-testid="grant-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={selectedRole === null || isPending}
              onClick={handleGrantClick}
              data-testid="grant-confirm-button"
            >
              Grant Role
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Typed confirm dialog */}
      {selectedRole !== null && (
        <TypedConfirmDialog
          open={showTypedConfirm}
          operation="role.grant"
          onConfirm={() => void handleTypedConfirm()}
          onCancel={handleTypedCancel}
          pending={isPending}
          previousError={error}
        />
      )}
    </>
  );
}
