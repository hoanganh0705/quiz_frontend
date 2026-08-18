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
import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface UnblockConfirmDialogProps {

open: boolean;

onOpenChange: (open: boolean) => void;

onConfirm: () => void;

isPending: boolean;
}

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