"use client";

/**
 * `<BadgeFlairPickerDialog />` — list owned badges and equip one as flair.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.D7.
 *
 * Each badge card surfaces a `<FlairPurchaseControl />` (the coin
 * spend-side control). The picker dialog just provides the layout;
 * the controls themselves own the spend flow + the
 * `<PurchaseConfirmDialog />`.
 */

import { Award } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { FlairPurchaseControl } from "@/features/coins/components/FlairPurchaseControl";

export interface OwnedBadgeSummary {
  id: string;
  name: string;
  description?: string | null;
  rarity?: string;
}

export interface BadgeFlairPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badges: readonly OwnedBadgeSummary[];
}

export function BadgeFlairPickerDialog({
  open,
  onOpenChange,
  badges,
}: BadgeFlairPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        data-testid="badge-flair-picker-dialog"
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Pick a flair</DialogTitle>
          <DialogDescription>
            Equip one of your earned badges as your profile flair for 7 days.
            Each equip costs 100 coins.
          </DialogDescription>
        </DialogHeader>

        {badges.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground"
            role="status"
          >
            <Award className="h-8 w-8" aria-hidden="true" />
            <p>You haven&apos;t earned any badges yet.</p>
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            role="list"
            aria-label="Your earned badges"
          >
            {badges.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {badge.name}
                  </span>
                  {badge.description ? (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {badge.description}
                    </span>
                  ) : null}
                  {badge.rarity ? (
                    <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {badge.rarity}
                    </span>
                  ) : null}
                </div>
                <FlairPurchaseControl
                  userBadgeId={badge.id}
                  badgeName={badge.name}
                  owned
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}