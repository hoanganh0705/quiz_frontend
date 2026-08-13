"use client";

/**
 * `<SuppressRecommendedControl />` — hide a quiz from the viewer's
 * "Recommended for you" feed for 14 days.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.D5.
 *
 * Used in the quiz detail page header. The button opens
 * `<PurchaseConfirmDialog />`; on confirm it calls
 * `useSuppressRecommendedQuiz().suppress(...)`. The backend writes a
 * row to `user_quiz_suppressions` and links it to the
 * `coin_transaction_id`.
 *
 * ## Active-suppression guard
 *
 * The component short-circuits when the quiz already has an active
 * suppression — re-buying a hide for a quiz the user already hid is a
 * no-op the server would reject with `COIN_SUPPRESS_ALREADY_ACTIVE`.
 */

import { useCallback, useState } from "react";
import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useSuppressRecommendedQuiz } from "@/features/coins/hooks/useSuppressRecommendedQuiz";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";
import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface SuppressRecommendedControlProps {
  quizId: string;
  quizTitle: string;
  /** Whether the viewer already has an active suppression on this quiz. */
  alreadySuppressed: boolean;
  className?: string;
}

export function SuppressRecommendedControl({
  quizId,
  quizTitle,
  alreadySuppressed,
  className,
}: SuppressRecommendedControlProps) {
  const spendFlag = getFeatureFlagValue("coin_spend_live");
  const isPlaceholder = spendFlag === "placeholder";

  const { suppress, isPending, error } = useSuppressRecommendedQuiz();
  const { balance } = useCoinWallet();

  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(() => {
    suppress({ quizId }, `suppress:${quizId}`);
    setOpen(false);
  }, [suppress, quizId]);

  if (isPlaceholder || alreadySuppressed) {
    return null;
  }

  const cost = COIN_SPEND_AMOUNTS.SUPPRESS_RECOMMENDED_14_DAY;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className={`gap-2 ${className ?? ""}`}
        data-testid="suppress-recommended-button"
        aria-label={`Hide this quiz from recommendations for ${cost} coins`}
      >
        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>Hide from recommendations ({cost})</span>
      </Button>
      <PurchaseConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Hide from recommendations?"
        body={`We won't surface "${quizTitle}" in your recommended feed for 14 days.`}
        confirmLabel={`Hide for ${cost} coins`}
        cost={cost}
        detail={quizTitle}
        isPending={isPending}
        error={error}
        currentBalance={balance}
      />
    </>
  );
}