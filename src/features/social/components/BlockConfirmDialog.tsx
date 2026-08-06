"use client";

/**
 * `BlockConfirmDialog` — Confirmation dialog for the block action.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.E1.
 *
 * ## Purpose
 *
 * Renders a confirm-before-block dialog triggered by `BlockButton`'s
 * `onBlockRequest` callback. Reads copy from the shared
 * `confirm-dialog-vocabulary.ts` registry (`BLOCK` entry). The body
 * explicitly warns about:
 *
 *   (a) **Bidirectionality** — the target user cannot see the actor's
 *       content, cannot follow the actor, and cannot send the actor a
 *       friend request.
 *   (b) **Silent follow removal** — if the actor is currently following
 *       the target, that follow is silently removed server-side.
 *
 * ## Props
 *
 *   - `open`         — controlled open state; parent controls via
 *                      `BlockButton`'s `onBlockRequest` callback.
 *   - `onOpenChange` — called when the dialog requests a state change
 *                      (ESC key, backdrop click, confirm, cancel).
 *   - `onConfirm`    — called when the user confirms; wires to
 *                      `useBlock().block()`.
 *   - `isPending`    — `true` while the block request is in-flight;
 *                      disables the confirm button and makes the
 *                      dialog non-dismissible.
 *
 * ## Non-dismissible behaviour
 *
 * When `isPending === true`, the dialog is locked: ESC key and
 * backdrop click are intercepted so the user cannot accidentally close
 * the dialog while the mutation is in-flight. This prevents
 * double-submit.
 *
 * ## Why the BlockedContentGate inverse case is handled in `BlockButton`
 *
 * The `BlockedContentGate` pattern is respected at the parent
 * (`BlockButton`): when the relationship is `blocked_by` (the viewer is
 * blocked by the target), `useSocialPermissions.canBlock` is `false`,
 * and the block affordance is not rendered. This dialog is therefore
 * only opened from non-blocked-by states.
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

export interface BlockConfirmDialogProps {
  /**
   * Whether the dialog is open.
   * Controlled by the parent (`BlockButton`'s `onBlockRequest`).
   */
  open: boolean;
  /**
   * Called when the dialog requests a state change.
   * Handles ESC key, backdrop click, confirm, and cancel.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the user clicks the confirm button.
   * Wires to `useBlock().block()`.
   */
  onConfirm: () => void;
  /**
   * `true` while the `block()` mutation is in-flight.
   * When `true`, the confirm button is replaced with
   * `FollowPendingIndicator` and the dialog cannot be dismissed.
   */
  isPending: boolean;
}

/**
 * Confirmation dialog for the block action.
 *
 * @example
 *   <BlockConfirmDialog
 *     open={dialogOpen}
 *     onOpenChange={setDialogOpen}
 *     onConfirm={() => block(targetUserId)}
 *     isPending={isBlockPending}
 *   />
 */
export function BlockConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: BlockConfirmDialogProps) {
  const copy = CONFIRM_DIALOGS.block;

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
            <FollowPendingIndicator text="Blocking..." size="sm" />
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