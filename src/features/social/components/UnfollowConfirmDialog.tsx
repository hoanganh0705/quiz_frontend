"use client";

/**
 * `UnfollowConfirmDialog` — Confirmation dialog for the unfollow action.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E3.
 *
 * ## Purpose
 *
 * Renders a confirm-before-unfollow dialog triggered by `FollowButton`'s
 * `onUnfollowRequest` callback. Reads copy from the shared
 * `confirm-dialog-vocabulary.ts` registry (`UNFOLLOW` entry). The body
 * explicitly warns about:
 *
 *   (a) The non-idempotent DELETE side-effect — the target user will no
 *       longer receive activity notifications about the actor.
 *   (b) The action is irreversible — the actor must send a new follow
 *       request to re-follow.
 *
 * ## Props
 *
 *   - `open`              — controlled open state; parent controls it via
 *                           `FollowButton`'s `onUnfollowRequest` callback.
 *   - `onOpenChange`      — called when the dialog requests a state change
 *                           (ESC key, backdrop click, confirm, cancel).
 *   - `onConfirm`         — called when the user confirms; wires to
 *                           `useUnfollow().unfollow()`.
 *   - `isPending`         — `true` while the `unfollow()` request is
 *                           in-flight; disables the confirm button and
 *                           makes the dialog non-dismissible.
 *
 * ## Non-dismissible behaviour
 *
 * When `isPending === true`, the dialog is locked: ESC key and backdrop
 * click are intercepted so the user cannot accidentally close the dialog
 * while the mutation is in-flight. This prevents double-submit.
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

export interface UnfollowConfirmDialogProps {
  /**
   * Whether the dialog is open.
   * Controlled by the parent (`FollowButton`'s `onUnfollowRequest`).
   */
  open: boolean;
  /**
   * Called when the dialog requests a state change.
   * Handles ESC key, backdrop click, confirm, and cancel.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the user clicks the confirm button.
   * Wires to `useUnfollow().unfollow()`.
   */
  onConfirm: () => void;
  /**
   * `true` while the `unfollow()` mutation is in-flight.
   * When `true`, the confirm button is replaced with
   * `FollowPendingIndicator` and the dialog cannot be dismissed.
   */
  isPending: boolean;
}

/**
 * Confirmation dialog for the unfollow action.
 *
 * @example
 *   <UnfollowConfirmDialog
 *     open={dialogOpen}
 *     onOpenChange={setDialogOpen}
 *     onConfirm={() => unfollow(targetUserId)}
 *     isPending={isUnfollowPending}
 *   />
 */
export function UnfollowConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: UnfollowConfirmDialogProps) {
  const copy = CONFIRM_DIALOGS.unfollow;

  const handleOpenChange = (nextOpen: boolean) => {
    // Non-dismissible when pending — prevents double-submit.
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
            <FollowPendingIndicator text="Unfollowing..." size="sm" />
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
