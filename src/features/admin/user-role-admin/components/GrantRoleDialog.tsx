"use client";

import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Loader2, ShieldAlert } from "lucide-react";

import { getUserCopy } from "@/lib/api/error-codes";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { TypedConfirmDialog } from "@/features/admin/components/TypedConfirmDialog";

import { useGrantUserRole } from "../hooks/useGrantUserRole";
import { RoleSetPicker } from "./RoleSetPicker";
import type { DocumentedRole } from "../user-role-admin-types";
import { getUserRoleConfirmMetadata } from "../user-role-confirm-strings";

export interface GrantRoleDialogProps {
  userId: string;

  username: string;

  isOpen: boolean;

  onClose: () => void;

  onSuccess: () => void;
}

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

  const metadata = selectedRole
    ? getUserRoleConfirmMetadata("grant", selectedRole.name, username)
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
              className="mt-2 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3"
              data-testid="grant-privilege-escalation-warning"
            >
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-warning"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metadata?.irreversibilityNotice}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              data-testid="grant-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={selectedRole === null || isPending}
              aria-busy={isPending}
              onClick={handleGrantClick}
              data-testid="grant-confirm-button"
              className="gap-2"
            >
              {isPending && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              <span>{isPending ? "Granting…" : "Grant Role"}</span>
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
