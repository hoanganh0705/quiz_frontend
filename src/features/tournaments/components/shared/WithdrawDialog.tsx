"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
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
import { cn } from "@/shared/utils/merge-class-names";

export interface WithdrawDialogProps {

open: boolean;

tournamentName?: string;

onConfirm: () => void;

onCancel: () => void;

loading?: boolean;

className?: string;
}

export function WithdrawDialog({
open,
tournamentName,
onConfirm,
onCancel,
loading = false,
className,
}: WithdrawDialogProps) {
return (
<AlertDialog
open={open}
onOpenChange={(next) => {
if (!next) {
onCancel();
        }
      }}
    >
<AlertDialogContent
className={cn("sm:max-w-md", className)}
data-testid="withdraw-dialog"
      >
<AlertDialogHeader>
<div className="flex items-center gap-3">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
<AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
</div>
<AlertDialogTitle>Withdraw from Tournament?</AlertDialogTitle>
</div>
<AlertDialogDescription className="pt-2">
{tournamentName ? (
<>
Are you sure you want to withdraw from{" "}
<span className="font-semibold text-foreground">
{tournamentName}
</span>
? This action is{" "}
<span className="font-semibold text-destructive">
permanent for the current round
                </span>{" "}
and cannot be undone.
              </>
            ) : (
<>
Are you sure you want to withdraw from this tournament? This
                action is{" "}
<span className="font-semibold text-destructive">
permanent for the current round
                </span>{" "}
and cannot be undone.
              </>
            )}
</AlertDialogDescription>
</AlertDialogHeader>

<AlertDialogFooter>
<AlertDialogCancel disabled={loading} data-testid="withdraw-dialog-cancel">
Cancel
          </AlertDialogCancel>
<AlertDialogAction asChild>
<Button
type="button"
variant="destructive"
disabled={loading}
onClick={(e) => {
e.preventDefault();
onConfirm();
              }}
data-testid="withdraw-dialog-confirm"
            >
{loading ? (
<>
<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
Withdrawing...
                </>
              ) : (
"Withdraw"
              )}
</Button>
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
  );
}
