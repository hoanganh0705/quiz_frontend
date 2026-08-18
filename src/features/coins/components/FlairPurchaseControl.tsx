"use client";

import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { usePurchaseFlair } from "@/features/coins/hooks/usePurchaseFlair";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";
import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface FlairPurchaseControlProps {
userBadgeId: string;
badgeName: string;

owned: boolean;
className?: string;
}

export function FlairPurchaseControl({
userBadgeId,
badgeName,
owned,
className,
}: FlairPurchaseControlProps) {
const spendFlag = getFeatureFlagValue("coin_spend_live");
const isPlaceholder = spendFlag === "placeholder";

const { purchaseFlair, isPending, error } = usePurchaseFlair();
const { balance } = useCoinWallet();

const [open, setOpen] = useState(false);

const handleConfirm = useCallback(() => {
purchaseFlair(
{ userBadgeId },
`flair:${userBadgeId}`,
    );
setOpen(false);
  }, [purchaseFlair, userBadgeId]);

if (isPlaceholder || !owned) {
return null;
  }

const cost = COIN_SPEND_AMOUNTS.FLAIR_7_DAY;

return (
<>
<Button
type="button"
variant="outline"
size="sm"
onClick={() => setOpen(true)}
disabled={isPending}
className={`gap-2 ${className ?? ""}`}
data-testid="flair-purchase-button"
aria-label={`Equip ${badgeName} as profile flair for ${cost} coins`}
      >
<Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
<span>Set as flair ({cost})</span>
</Button>
<PurchaseConfirmDialog
open={open}
onOpenChange={setOpen}
onConfirm={handleConfirm}
title={`Set "${badgeName}" as your flair`}
body={`Show this badge as your profile flair for 7 days.`}
confirmLabel={`Equip for ${cost} coins`}
cost={cost}
detail={badgeName}
isPending={isPending}
error={error}
currentBalance={balance}
      />
</>
  );
}