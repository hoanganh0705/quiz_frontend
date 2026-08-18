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
import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";
import { useUnfriend } from "@/features/social/hooks/useUnfriend";

export interface UnfriendConfirmDialogProps {

readonly open: boolean;

readonly onOpenChange: (open: boolean) => void;

readonly targetUserId: string | null;
}

export function UnfriendConfirmDialog({
open,
onOpenChange,
targetUserId,
}: UnfriendConfirmDialogProps): React.JSX.Element | null {
const copy = CONFIRM_DIALOGS.unfriend;
const { unfriend, isPending, error, alreadyNotFriends } =
useUnfriend(targetUserId);

if (typeof targetUserId !== "string" || targetUserId.length === 0) {
return null;
  }

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
