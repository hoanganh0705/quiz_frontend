"use client";

import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";

export interface CoinEarningsSummaryProps {
  isPlaceholder: boolean;
  isLoading: boolean;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Income/spend summary, sourced from the coin wallet's
 * `lifetimeEarned` / `lifetimeSpent` totals.
 *
 * No mock numbers — when the wallet is unavailable the rows show "—".
 */
export function CoinEarningsSummary({
  isPlaceholder,
  isLoading,
}: CoinEarningsSummaryProps): React.ReactElement {
  const { wallet } = useCoinWallet();

  const earned = wallet?.lifetimeEarned ?? null;
  const spent = wallet?.lifetimeSpent ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Card data-testid="coins-earned-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <ArrowUpRight
              className="h-3.5 w-3.5 text-emerald-500"
              aria-hidden="true"
            />
            Lifetime earned
          </div>
          <p
            className="text-2xl font-semibold tabular-nums mt-1"
            data-testid="coins-earned-value"
          >
            {isLoading && earned === null ? (
              <span
                className="inline-flex items-center gap-2 text-muted-foreground"
                aria-label="Loading lifetime earned"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                …
              </span>
            ) : isPlaceholder || earned === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              INTEGER_FORMAT.format(earned)
            )}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="coins-spent-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <ArrowDownLeft
              className="h-3.5 w-3.5 text-rose-500"
              aria-hidden="true"
            />
            Lifetime spent
          </div>
          <p
            className="text-2xl font-semibold tabular-nums mt-1"
            data-testid="coins-spent-value"
          >
            {isLoading && spent === null ? (
              <span
                className="inline-flex items-center gap-2 text-muted-foreground"
                aria-label="Loading lifetime spent"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                …
              </span>
            ) : isPlaceholder || spent === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              INTEGER_FORMAT.format(spent)
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
