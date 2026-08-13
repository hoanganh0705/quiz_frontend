"use client";

/**
 * `<TipAuthorButton />` — quiz-author tip affordance.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.D3.
 *
 * The button opens a `<PurchaseConfirmDialog />` with the standard
 * tip amount. On confirm it calls `useTipAuthor().tip(...)`. The
 * dialog surfaces the `<InsufficientCoinsNotice />` automatically
 * when the typed error code is `INSUFFICIENT_COINS`.
 *
 * ## Self-tip guard
 *
 * The component short-circuits when `recipientUserId === currentUserId`
 * — the server's `COIN_TIP_SELF_NOT_ALLOWED` error is a 403, so we
 * hide the button entirely rather than ask the user to confirm an
 * action that will always fail.
 *
 * ## Daily-tip cap
 *
 * The component does NOT enforce `COIN_DAILY_TIP_LIMIT` client-side
 * (the server is the source of truth). When the user hits the cap the
 * server returns `COIN_TIP_DAILY_CAP_EXCEEDED` and the
 * `<PurchaseConfirmDialog />` surfaces the relevant copy.
 */

import { useCallback, useState } from "react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useTipAuthor } from "@/features/coins/hooks/useTipAuthor";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";
import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface TipAuthorButtonProps {
  /** The quiz author's user id. The recipient of the tip. */
  recipientUserId: string;
  /** The current user's id. Used to enforce the self-tip guard. */
  currentUserId: string | null;
  /** Username / display name surfaced in the dialog body. */
  recipientDisplayName?: string | null;
  /** Quiz id for the optional `quizId` reference (logged in metadata). */
  quizId?: string;
  className?: string;
}

export function TipAuthorButton({
  recipientUserId,
  currentUserId,
  recipientDisplayName,
  quizId,
  className,
}: TipAuthorButtonProps) {
  const coinFlag = getFeatureFlagValue("coin_economy_live");
  const spendFlag = getFeatureFlagValue("coin_spend_live");
  const isPlaceholder =
    coinFlag === "placeholder" || spendFlag === "placeholder";

  const { tip, isPending, error } = useTipAuthor();
  const { balance } = useCoinWallet();

  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(() => {
    tip(
      {
        recipientUserId,
        ...(quizId !== undefined ? { quizId } : {}),
      },
      // Deterministic key: retries converge on the same ledger row.
      // Server also derives a deterministic key as a fallback when
      // the header is missing — see `CoinSpendController`.
      `tip:${currentUserId ?? "anon"}:${recipientUserId}:${quizId ?? "no-quiz"}`,
    );
    setOpen(false);
  }, [tip, recipientUserId, quizId, currentUserId]);

  const isSelfTip = currentUserId !== null && recipientUserId === currentUserId;

  if (isPlaceholder || isSelfTip) {
    return null;
  }

  const cost = COIN_SPEND_AMOUNTS.TIP_STANDARD;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className={`gap-2 ${className ?? ""}`}
        data-testid="tip-author-button"
        aria-label={`Tip the quiz author ${COIN_SPEND_AMOUNTS.TIP_STANDARD} coins`}
      >
        <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <span>Tip {cost}</span>
      </Button>
      <PurchaseConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Tip the quiz author"
        body={`Send ${cost} coins to ${recipientDisplayName ?? "the author"} as a thank-you for this quiz.`}
        confirmLabel={`Send ${cost} coins`}
        cost={cost}
        detail={recipientDisplayName ?? null}
        isPending={isPending}
        error={error}
        currentBalance={balance}
      />
    </>
  );
}