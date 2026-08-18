"use client";

import { useCallback, useState } from "react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useTipAuthor } from "@/features/coins/hooks/useTipAuthor";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";
import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface TipAuthorButtonProps {

recipientUserId: string;

currentUserId: string | null;

recipientDisplayName?: string | null;

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