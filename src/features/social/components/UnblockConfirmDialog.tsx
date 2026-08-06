"use client";

/**
 * `UnblockConfirmDialog` — Confirmation dialog for the unblock action.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.E1.
 *
 * ## Purpose
 *
 * Renders a confirm-before-unblock dialog triggered by `BlockButton`'s
 * `onUnblockRequest` callback (or the inline confirm on the
 * `BlockedUsersListPage` rows). Reads copy from the shared
 * `confirm-dialog-vocabulary.ts` registry (`UNBLOCK` entry). The body
 * explicitly documents:
 *
 *   (a) **Prior-relationship-state restoration** — unblocking restores
 *       the prior relationship state (followed / not-followed, pending
 *       friend request / none) subject to each side's privacy
 *       settings.
 *   (b) **Non-idempotent DELETE semantics** — unblocking a user that
 *       is already not blocked is a successful terminal state (the
 *       hook maps `SOCIAL_USER_NOT_BLOCKED` to `error: null`); the
 *       UI does not surface an error banner.
 *
 * ## Props
 *
 *   - `open`         — controlled open state; parent controls via
 *                      `BlockButton`'s `onUnblockRequest` callback.
 *   - `onOpenChange` — called when the dialog requests a state change.
 *   - `onConfirm`    — called when the user confirms; wires to
 *                      `useUnblock().unblock()`.
 *   - `isPending`    — `true` while the unblock request is in-flight;
 *                      disables the confirm button and makes the
 *                      dialog non-dismissible.
 *
 * ## Non-dismissible behaviour
 *
 * When `isPending === true`, the dialog is locked (ESC + backdrop
 * click intercepted) to prevent double-submit. Mirrors the
 * `UnfollowConfirmDialog` (TKT-6.6.E3) and `BlockConfirmDialog`
 * (TKT-6.7.E1) patterns.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";

import { CONFIRM_DIALOGS } from "@/features/social/components/confirm-dialog-vocabulary";
import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface UnblockConfirmDialogProps {
  /**
   * Whether the dialog is open.
   * Controlled by the parent (e.g. `BlockButton`'s `onUnblockRequest`,
   * or the inline confirm on `BlockedUsersListPage`).
   */
  open: boolean;
  /**
   * Called when the dialog requests a state change.
   * Handles ESC key, backdrop click, confirm, and cancel.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the user clicks the confirm button.
   * Wires to `useUnblock().unblock()`.
   */
  onConfirm: () => void;
  /**
   * `true` while the `unblock()` mutation is in-flight.
   * When `true`, the confirm button is replaced with
   * `FollowPendingIndicator` and the dialog cannot be dismissed.
   */
  isPending: boolean;
}

/**
 * Confirmation dialog for the unblock action.
 *
 * @example
 *   <UnblockConfirmDialog
 *     open={dialogOpen}
 *     onOpenChange={setDialogOpen}
 *     onConfirm={() => unblock(targetUserId)}
 *     isPending={isUnblockPending}
 *   />
 */
export function UnblockConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: UnblockConfirmDialogProps) {
  const copy = CONFIRM_DIALOGS.unblock;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (isPending) return;
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={copy.dataTestid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {copy.cancelLabel}
          </AlertDialogCancel>

          {isPending ? (
            <FollowPendingIndicator text="Unblocking..." size="sm" />
          ) : (
            <AlertDialogAction onClick={handleConfirm}>
              {copy.confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}