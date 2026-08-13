"use client";

/**
 * `<PurchaseConfirmDialog />` — generic typed-confirm for coin
 * spend-side mutations.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.E2.
 *
 * Mirrors the typed-confirm discipline of `<UnfollowConfirmDialog />`
 * and `<UnfriendConfirmDialog />` (Epic 6.6 / 6.8): a Radix dialog
 * with a title, a body that surfaces the cost, and a single primary
 * button. The cancel button is keyboard-focusable by default (Radix
 * handles focus-trap + Esc).
 *
 * The dialog is fully controlled — the parent owns the open state and
 * passes the latest `isPending` / `error` so the dialog can render
 * `<InsufficientCoinsNotice />` inline when the spend fails with
 * `INSUFFICIENT_COINS`.
 *
 * ## Why a generic dialog
 *
 * Each spend-side category (tip / flair / suppress / admin-adjust)
 * has a different copy + a different cost. Rather than hard-coding
 * the cost strings inside the dialog, the dialog accepts a `cost`,
 * `title`, `body`, `confirmLabel`, and optional `detail` row. The
 * specific affordances (tip button / flair button / suppress button)
 * each provide their own copy and call this dialog with their
 * `cost` derived from `COIN_SPEND_AMOUNTS` (mirrored client-side).
 */

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
  /** Short, single-sentence description of what the spend does. */
  body: string;
  /** Primary action label (default: "Confirm"). */
  confirmLabel?: string;
  /** Cancel action label (default: "Cancel"). */
  cancelLabel?: string;
  /** Coin cost of the action — surfaces in the cost row + the notice. */
  cost: number;
  /** Optional human-readable detail row (e.g. recipient username). */
  detail?: string | null;
  isPending?: boolean;
  /** Coin error code, if the most recent mutation failed. */
  error?: string | null;
  /** Wallet balance at error time, for the notice body. */
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