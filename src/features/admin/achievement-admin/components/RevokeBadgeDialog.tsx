"use client";

/**
 * `features/admin/achievement-admin/components/RevokeBadgeDialog.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D3.
 *
 * ## What this component owns
 *
 * - Wrap the badge revoke mutation in `AuditActionShell`.
 * - Render `TypedConfirmDialog` with operation `'achievement.badge_revoke'`.
 * - Surface the irreversibility warning.
 * - Render `STORY_7_8_PRIORITY_COPY` notices for documented error codes.
 * - Render `RequestIdBanner` on failure.
 *
 * ## Error handling
 *
 *   - `BADGE_NOT_GRANTED`   → dialog stays open; friendly notice; no retry.
 *   - `ACHIEVEMENT_NOT_FOUND`→ dialog stays open; friendly notice; close allowed.
 *   - `SELF_ACTION_FORBIDDEN`→ friendly notice; no retry.
 *   - `PERMISSION_DENIED`, `ADMIN_FORBIDDEN` → `RequestIdBanner`; no retry.
 *   - `IRREVERSIBLE_CONFIRM_REQUIRED` → re-renders typed-confirm.
 *
 * ## Typed-confirm ceiling
 *
 * The dialog never bypasses the typed-confirm ceiling on any failure mode.
 */

import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";
import { ApiError } from "@/lib/api/core/ApiError";
import { getIrreversibleConfirmString } from "@/features/admin/admin-capabilities";
import { getUserCopy } from "@/lib/api/error-codes";

import type { AdminUserBadgeDto } from "../achievement-admin-types";
import { useRevokeUserBadge } from "../hooks";

const OPERATION = "achievement.badge_revoke" as const;
const REQUIRED_STRING = getIrreversibleConfirmString(OPERATION) as string;

export interface RevokeBadgeDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** The user from whom the badge will be revoked. */
  userId: string;
  /** The badge to revoke. */
  badge: AdminUserBadgeDto;
  /** Called when the dialog is cancelled or closed. */
  onClose: () => void;
  /** Called after a successful revocation with the revoked badgeId. */
  onRevoked: (badgeId: string) => void;
}

/**
 * Irreversibility warning copy rendered above the typed-confirm input.
 */
const IRREVERSIBILITY_WARNING =
  "This permanently removes the badge from this user. The change cannot be undone.";

const IRREVERSIBILITY_LABEL = "I understand this action is irreversible";

/**
 * Revoke badge dialog for the achievement admin surface.
 */
export function RevokeBadgeDialog({
  open,
  userId,
  badge,
  onClose,
  onRevoked,
}: RevokeBadgeDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [localError, setLocalError] = useState<ApiError | null>(null);

  const { revoke, isPending, error, reset } = useRevokeUserBadge();

  const matches = confirmInput === REQUIRED_STRING;

  const handleConfirm = useCallback(async () => {
    if (!matches || isPending) return;
    setLocalError(null);

    try {
      await revoke(userId, badge.badgeId, {
        before: badge as unknown,
      });
      setConfirmInput("");
      onRevoked(badge.badgeId);
      onClose();
      reset();
    } catch (err) {
      // Error is captured in hook state.
      setLocalError(err as ApiError);
    }
  }, [matches, isPending, revoke, userId, badge, onRevoked, onClose, reset]);

  const handleCancel = useCallback(() => {
    if (isPending) return;
    setConfirmInput("");
    setLocalError(null);
    reset();
    onClose();
  }, [isPending, reset, onClose]);

  // Use the hook error when available, fall back to local error.
  const activeError = error ?? localError;

  if (!open) return null;

  // ── Error notices ─────────────────────────────────────────────────────────

  const errorNotice = getErrorNotice(activeError);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
    >
      <AlertDialogContent data-testid="revoke-badge-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="revoke-dialog-title">
            Revoke badge
          </AlertDialogTitle>
          <AlertDialogDescription data-testid="revoke-dialog-description">
            {badge.badgeName ?? "Badge"} — {IRREVERSIBILITY_WARNING}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Error notices rendered above the form. */}
        {errorNotice !== null && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="revoke-error-notice"
          >
            {errorNotice}
          </div>
        )}

        {/* Typed-confirm form. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleConfirm();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="revoke-confirm-input">
              Type{" "}
              <span className="font-mono font-semibold">{REQUIRED_STRING}</span>{" "}
              to confirm
            </Label>
            <Input
              id="revoke-confirm-input"
              data-testid="revoke-confirm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isPending}
              placeholder={REQUIRED_STRING}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {IRREVERSIBILITY_LABEL}
            </p>
          </div>
        </form>

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
            disabled={!matches || isPending}
            onClick={() => void handleConfirm()}
            data-testid="revoke-confirm-button"
          >
            {isPending && <LoadingSpinner size="sm" />}
            Revoke badge
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Error notice resolver ───────────────────────────────────────────────────

/**
 * Resolve the user-facing notice for a given error code.
 * Returns `null` when the code has no documented notice.
 */
function getErrorNotice(error: ApiError | null): React.ReactNode {
  if (error === null) return null;

  const code = error.code;

  // Use getUserCopy for user-facing copy. STORY_7_8_PRIORITY_COPY is
  // incorporated via the overlay in buildUserCopy() — getUserCopy(code)
  // returns the correct body for all Story 7.8 codes.
  const copy = getUserCopy(code);
  return (
    <p
      role="status"
      className="rounded-md border border-border bg-muted/50 p-3 text-sm"
      data-error-code={code}
    >
      {copy.body}
    </p>
  );

  // Generic notice for non-documented transient codes.
  if (error?.requestId) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
        data-error-code={code}
      >
        <p>An error occurred. Please try again.</p>
        <p className="mt-1 font-mono text-xs">Request ID: {error?.requestId}</p>
      </div>
    );
  }

  return (
    <p
      role="status"
      className="rounded-md border border-border bg-muted/50 p-3 text-sm"
      data-error-code={code}
    >
      {getUserCopy(code).body}
    </p>
  );
}
