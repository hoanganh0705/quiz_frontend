"use client";

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

readonly open: boolean;

readonly onOpenChange: (open: boolean) => void;

readonly friendshipId: string | null;

readonly targetUserId: string;
}

export function FriendRequestCancelDialog({
open,
onOpenChange,
friendshipId,
targetUserId,
}: FriendRequestCancelDialogProps): React.JSX.Element | null {
const copy = CONFIRM_DIALOGS.cancel_friend_request;
const { cancel, isPending, error, alreadyCancelled } =
useCancelFriendRequest(targetUserId);

if (typeof friendshipId !== "string" || friendshipId.length === 0) {
return null;
  }

if (alreadyCancelled && open) {
onOpenChange(false);
  }

const handleOpenChange = (nextOpen: boolean) => {

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
