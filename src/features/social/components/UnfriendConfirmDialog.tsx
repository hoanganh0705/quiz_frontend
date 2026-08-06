"use client";

/**
 * `UnfriendConfirmDialog` — Confirmation dialog for the unfriend action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E4.
 *
 * ## Purpose
 *
 * Renders a confirm-before-unfriend dialog. Reads copy from the
 * shared `confirm-dialog-vocabulary.ts` registry (`unfriend` entry —
 * TKT-6.8.F2). The body explicitly warns about:
 *
 *   (a) The non-idempotent DELETE side-effect.
 *   (b) The friend-request lifecycle side effect — unfriending does
 *       NOT auto-cancel a pending friend request (the user must
 *       cancel it separately via the outgoing-list Cancel dialog).
 *   (c) The visibility side effect — the unfriended user can no
 *       longer see the actor's friend-only content.
 *
 * ## Props
 *
 *   - `open`              — controlled open state; the parent
 *                           controls it via `FriendRequestCta`'s
 *                           `onOpenUnfriendDialog` callback.
 *   - `onOpenChange`      — called when the dialog requests a state
 *                           change (ESC, backdrop, confirm, cancel).
 *   - `targetUserId`      — the target user to unfriend. Defensive
 *                           empty state hides the dialog when no id
 *                           is provided.
 *
 * ## Non-dismissible behaviour
 *
 * When `isPending === true`, the dialog is locked: ESC key and
 * backdrop click are intercepted so the user cannot accidentally
 * close the dialog while the mutation is in-flight.
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
import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";
import { useUnfriend } from "@/features/social/hooks/useUnfriend";

export interface UnfriendConfirmDialogProps {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;
  /**
   * Called when the dialog requests a state change.
   */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * The target user's stable identifier. The hook needs this to
   * derive the permission flag and the SWR cache keys to invalidate.
   */
  readonly targetUserId: string | null;
}

/**
 * Confirmation dialog for the unfriend action.
 *
 * @example
 *   <UnfriendConfirmDialog
 *     open={dialogOpen}
 *     onOpenChange={setDialogOpen}
 *     targetUserId={targetUserId}
 *   />
 */
export function UnfriendConfirmDialog({
  open,
  onOpenChange,
  targetUserId,
}: UnfriendConfirmDialogProps): React.JSX.Element | null {
  const copy = CONFIRM_DIALOGS.unfriend;
  const { unfriend, isPending, error, alreadyNotFriends } =
    useUnfriend(targetUserId);

  // Defensive empty state.
  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    return null;
  }

  // The terminal-state cleanup: if the viewer is no longer friends,
  // close the dialog (the hook has revalidated the cache).
  if (alreadyNotFriends && open) {
    onOpenChange(false);
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (isPending) return;
    unfriend();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={copy.dataTestid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>

        {error !== null && (
          <FriendRequestErrorBanner error={error} onAction={handleConfirm} />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {copy.cancelLabel}
          </AlertDialogCancel>

          {isPending ? (
            <LoadingSpinner
              size="sm"
              variant="secondary"
              text="Unfriending…"
              aria-label="Unfriending"
            />
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
