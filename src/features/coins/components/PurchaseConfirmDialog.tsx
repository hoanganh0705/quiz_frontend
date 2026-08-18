"use client";

import * as React from "react";

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
      >
<DialogHeader>
<DialogTitle>{title}</DialogTitle>
<DialogDescription>{body}</DialogDescription>
</DialogHeader>

<div className="space-y-3">
<dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
<dt className="text-muted-foreground">Cost</dt>
<dd
className="font-semibold tabular-nums"
data-testid="purchase-confirm-cost"
            >
{cost.toLocaleString("en-US")} coins
            </dd>
{detail ? (
<>
<dt className="text-muted-foreground">Detail</dt>
<dd className="font-medium">{detail}</dd>
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

<DialogFooter>
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