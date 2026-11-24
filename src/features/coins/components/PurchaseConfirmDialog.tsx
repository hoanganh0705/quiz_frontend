"use client";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { InsufficientCoinsNotice } from "./InsufficientCoinsNotice";

export interface PurchaseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  cost: number;
  detail?: string | null;
  isPending?: boolean;
  error?: string | null;
  currentBalance?: number | null;
}

export function PurchaseConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  cost,
  detail,
  isPending = false,
  error = null,
  currentBalance = null,
}: PurchaseConfirmDialogProps) {
  const showInsufficientNotice = error === "INSUFFICIENT_COINS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        data-testid="purchase-confirm-dialog"
        className="max-w-md rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-sm">
            <dt className="text-xs uppercase font-semibold tracking-wider text-muted-foreground self-center">
              Cost
            </dt>
            <dd
              className="font-mono text-base font-bold tabular-nums text-foreground"
              data-testid="purchase-confirm-cost"
            >
              {cost.toLocaleString("en-US")} coins
            </dd>
            {detail ? (
              <>
                <dt className="text-xs uppercase font-semibold tracking-wider text-muted-foreground self-center">
                  Target
                </dt>
                <dd className="font-mono text-xs text-muted-foreground truncate self-center">
                  {detail}
                </dd>
              </>
            ) : null}
          </dl>

          {showInsufficientNotice ? (
            <InsufficientCoinsNotice
              required={cost}
              currentBalance={currentBalance}
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="purchase-confirm-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            data-testid="purchase-confirm-submit"
          >
            {isPending ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
