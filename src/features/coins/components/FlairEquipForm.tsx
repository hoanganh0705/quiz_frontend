"use client";

import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { usePurchaseFlair } from "@/features/coins/hooks/usePurchaseFlair";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface FlairEquipFormProps {
  currentBalance: number | null;
  isPlaceholder: boolean;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `<FlairEquipForm />` — Phase 5.2 spend form.
 *
 * Lets a user spend coins to equip a badge as profile flair for 7 days.
 * The user supplies the `userBadgeId` (visible on badge-detail pages);
 * we do not enumerate the user's badges here because that lives on
 * `/profile/badges`. Once the backend confirms the badge is owned and
 * not revoked, the flair is applied for 7 days.
 */
export function FlairEquipForm({
  currentBalance,
  isPlaceholder,
}: FlairEquipFormProps): React.ReactElement {
  const cost = COIN_SPEND_AMOUNTS.FLAIR_7_DAY;
  const { purchaseFlair, isPending, error } = usePurchaseFlair();

  const badgeId = useId();

  const [userBadgeId, setUserBadgeId] = useState("");
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const insufficient = currentBalance !== null && currentBalance < cost;

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setValidationError(null);
  }, []);

  const handleSubmit = useCallback((): void => {
    const trimmed = userBadgeId.trim();
    if (!UUID_PATTERN.test(trimmed)) {
      setValidationError("Badge id must be a UUID (e.g. 0190f6a5-…).");
      return;
    }
    setValidationError(null);
    purchaseFlair({ userBadgeId: trimmed }, `flair:${trimmed}`);
    setOpen(false);
  }, [purchaseFlair, userBadgeId]);

  const disabledReason = isPlaceholder
    ? "Coin spend is in preview mode."
    : insufficient
      ? `You need at least ${INTEGER_FORMAT.format(cost)} coins to equip flair.`
      : null;

  const confirmDisabled = disabledReason !== null;

  return (
    <Card data-testid="flair-equip-form-card">
      <CardContent className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Equip a badge you own as profile flair for 7 days
          ({INTEGER_FORMAT.format(cost)} coins).
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={badgeId}>Badge id (UUID)</Label>
          <Input
            id={badgeId}
            type="text"
            placeholder="0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a"
            value={userBadgeId}
            onChange={(event) => setUserBadgeId(event.target.value)}
            disabled={isPlaceholder}
            data-testid="flair-badge-input"
          />
        </div>

        {validationError ? (
          <p
            className="text-xs text-rose-600 dark:text-rose-300"
            data-testid="flair-validation-error"
            role="alert"
          >
            {validationError}
          </p>
        ) : null}

        {disabledReason ? (
          <p
            className="text-xs text-muted-foreground"
            data-testid="flair-disabled-reason"
          >
            {disabledReason}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => handleOpenChange(true)}
            disabled={confirmDisabled}
            data-testid="flair-submit-button"
          >
            Equip for {INTEGER_FORMAT.format(cost)} coins
          </Button>
        </div>

        <PurchaseConfirmDialog
          open={open}
          onOpenChange={handleOpenChange}
          onConfirm={handleSubmit}
          title="Equip flair"
          body={`This will deduct ${INTEGER_FORMAT.format(cost)} coins from your balance and equip the badge as your profile flair for 7 days.`}
          confirmLabel={`Equip for ${INTEGER_FORMAT.format(cost)} coins`}
          cost={cost}
          detail={userBadgeId.trim().length > 0 ? userBadgeId.trim() : null}
          isPending={isPending}
          error={error}
          currentBalance={currentBalance}
        />
      </CardContent>
    </Card>
  );
}
