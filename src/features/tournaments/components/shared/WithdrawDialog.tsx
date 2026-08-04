"use client";

/**
 * `WithdrawDialog` — withdrawal confirmation dialog for tournament withdrawal.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.C1.
 *
 * ## Purpose
 *
 * A confirmation dialog that warns the user that withdrawal is irreversible
 * for the current tournament before they confirm the destructive action.
 * The dialog is shown by the `TournamentRegistrationCta`; the CTA's
 * `withdraw()` call is made only after the user explicitly confirms.
 *
 * ## Composition
 *
 * Built on the existing `<ConfirmDialog />` primitive from Phase 4
 * (TKT-4.1.D2). Uses the `destructive-permanent` kind with custom
 * entity label for the tournament name.
 *
 * ## Keyboard accessibility
 *
 * - Escape key cancels the dialog
 * - Enter key confirms (when no typed-confirm is required)
 * - Focus is trapped within the dialog while open
 * - Focus returns to the trigger button when the dialog closes
 */

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
  /** Controlled open state. */
  open: boolean;
  /** Tournament name to display in the dialog. */
  tournamentName?: string;
  /** Fired when the user confirms withdrawal. */
  onConfirm: () => void;
  /** Fired when the user cancels or closes the dialog. */
  onCancel: () => void;
  /** Whether the mutation is in flight. Disables the confirm button. */
  loading?: boolean;
  /** Optional className for the dialog content. */
  className?: string;
}

/**
 * The tournament withdrawal confirmation dialog.
 */
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
