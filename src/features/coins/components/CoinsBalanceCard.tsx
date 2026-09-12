"use client";

import { Coins, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";

export interface CoinsBalanceCardProps {
  balance: number | null;
  isLoading: boolean;
  isPlaceholder: boolean;
  error: ApiError | null;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Top-of-page summary card showing the current coin balance.
 *
 * - `balance: null` while SWR is fetching → skeleton.
 * - `isPlaceholder: true` → shows "—" (placeholder wallet, no network).
 * - `error` set → renders an inline alert with the message; we do NOT
 *   fall back to a fake number — the error is honest.
 */
export function CoinsBalanceCard({
  balance,
  isLoading,
  isPlaceholder,
  error,
}: CoinsBalanceCardProps): React.ReactElement {
  const isEmpty = !isLoading && balance === null && !error;

  return (
    <Card data-testid="coins-balance-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Current balance
            </p>
            <p
              className="text-4xl sm:text-5xl font-bold tabular-nums mt-1"
              data-testid="coins-balance-value"
            >
              {isLoading ? (
                <span
                  className="inline-flex items-center gap-2 text-muted-foreground"
                  aria-label="Loading balance"
                >
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  …
                </span>
              ) : isEmpty ? (
                <span className="text-muted-foreground">—</span>
              ) : isPlaceholder ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                INTEGER_FORMAT.format(balance ?? 0)
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPlaceholder
                ? "Coin economy is in preview mode — actions are disabled."
                : "Coins earned through quizzes, challenges, and rewards."}
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="mt-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            role="alert"
            data-testid="coins-balance-error"
          >
            Could not load your wallet: {error.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
