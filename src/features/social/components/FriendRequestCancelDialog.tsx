"use client";

/**
 * `FriendRequestCancelDialog` — Confirmation dialog for cancelling a
 * pending outgoing friend request.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E3.
 *
 * ## Purpose
 *
 * Renders a confirm-before-cancel dialog triggered by the outgoing
 * request "Cancel" button. Reads copy from the shared
 * `confirm-dialog-vocabulary.ts` registry (`cancel_friend_request`
 * entry — TKT-6.8.F2). The body explicitly warns about:
 *
 *   (a) The non-idempotent DELETE side-effect — the request is
 *       removed from the recipient's incoming list.
 *   (b) The action is irreversible — the user must send a new
 *       request to re-send.
 *
 * ## Props
 *
 *   - `open`              — controlled open state; the parent decides
 *                           when to open / close.
 *   - `onOpenChange`      — called when the dialog requests a state
 *                           change (ESC, backdrop, confirm, cancel).
 *   - `onConfirm`         — optional override; defaults to calling
 *                           `useCancelFriendRequest(friendshipId)`.
 *   - `friendshipId`      — the internal id of the request to
 *                           cancel. Defensive empty state hides the
 *                           dialog when no id is provided.
 *
 * ## Non-dismissible behaviour
 *
 * When `isPending === true`, the dialog is locked: ESC key and
 * backdrop click are intercepted so the user cannot accidentally
 * close the dialog while the mutation is in-flight (prevents
 * double-submit).
 *
 * ## `friendshipId` hygiene
 *
 * The `friendshipId` is consumed ONLY as an in-memory prop and
 * forwarded to `useCancelFriendRequest` for use as a path
 * parameter. It is never persisted or logged.
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
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";
import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { useCancelFriendRequest } from "@/features/social/hooks/useCancelFriendRequest";

export interface FriendRequestCancelDialogProps {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;
  /**
   * Called when the dialog requests a state change.
   * Handles ESC key, backdrop click, confirm, and cancel.
   */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * The internal id of the request to cancel. Defensive: dialog
   * renders nothing when this is not provided.
   */
  readonly friendshipId: string | null;
  /**
   * The target user's stable identifier. The hook needs this to
   * derive the permission flag and the SWR cache keys to invalidate.
   */
  readonly targetUserId: string;
}

/**
 * Confirmation dialog for cancelling a pending outgoing friend
 * request.
 *
 * @example
 *   <FriendRequestCancelDialog
 *     open={dialogOpen}
 *     onOpenChange={setDialogOpen}
 *     friendshipId={request.id}
 *     targetUserId={request.requesterId}
 *   />
 */
export function FriendRequestCancelDialog({
  open,
  onOpenChange,
  friendshipId,
  targetUserId,
}: FriendRequestCancelDialogProps): React.JSX.Element | null {
  const copy = CONFIRM_DIALOGS.cancel_friend_request;
  const { cancel, isPending, error, alreadyCancelled } =
    useCancelFriendRequest(targetUserId);

  // Defensive empty state.
  if (typeof friendshipId !== "string" || friendshipId.length === 0) {
    return null;
  }

  // The terminal-state cleanup: if the request is already cancelled,
  // close the dialog (the hook has revalidated the cache).
  if (alreadyCancelled && open) {
    onOpenChange(false);
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Non-dismissible when pending — prevents double-submit.
    if (isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (isPending) return;
    cancel(friendshipId);
    // The parent owns the dismissal — on success or on the terminal
    // state, the row is removed from the outgoing list and the
    // parent will close the dialog.
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={copy.dataTestid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>

        {error !== null && (
          <FriendRequestErrorBanner
            error={error}
            onAction={handleConfirm}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {copy.cancelLabel}
          </AlertDialogCancel>

          {isPending ? (
            <LoadingSpinner
              size="sm"
              variant="secondary"
              text="Cancelling…"
              aria-label="Cancelling friend request"
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
