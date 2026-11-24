"use client";

import { AlertCircle, Coins, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { ApiError } from "@/lib/api";

export interface CoinsBalanceCardProps {
  balance: number | null;
  isLoading: boolean;
  isPlaceholder: boolean;
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Top-of-page summary card showing the current coin balance.
 *
 * - `balance: null` while data is fetching → loading skeleton.
 * - `isPlaceholder: true` → shows "—" (placeholder wallet, no network).
 * - `error` set → renders an inline alert with the message and retry button.
 */
export function CoinsBalanceCard({
  balance,
  isLoading,
  isPlaceholder,
  error,
  onRetry,
  className,
}: CoinsBalanceCardProps): React.ReactElement {
  const isEmpty = !isLoading && balance === null && !error;

  return (
    <Card
      data-testid="coins-balance-card"
      className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/90 to-card/70 p-0 backdrop-blur-xs shadow-xs dark:border-amber-500/20 h-full flex flex-col justify-between ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden="true"
      />
      <CardContent className="p-6 sm:p-7 flex flex-col justify-between h-full relative z-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Current balance</span>
            </div>

            <div className="flex items-baseline gap-2">
              <p
                className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-foreground"
                data-testid="coins-balance-value"
              >
                {isLoading ? (
                  <span
                    className="inline-flex items-center gap-2 text-muted-foreground"
                    aria-label="Loading balance"
                  >
                    <Loader2
                      className="h-7 w-7 animate-spin motion-reduce:animate-none text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    …
                  </span>
                ) : isEmpty || isPlaceholder ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  INTEGER_FORMAT.format(balance ?? 0)
                )}
              </p>
              {!isLoading && !isEmpty && !isPlaceholder ? (
                <span className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                  coins
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground max-w-md">
              {isPlaceholder
                ? "Coin economy is in preview mode — actions are disabled."
                : "Coins earned through quizzes, daily challenges, and tournament victories."}
            </p>
          </div>

          <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs transition-transform duration-300 hover:scale-105">
            <Coins className="h-8 w-8" aria-hidden="true" />
          </div>
        </div>

        {error ? (
          <div
            className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3.5 text-xs text-destructive"
            role="alert"
            data-testid="coins-balance-error"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>Could not load your wallet: {error.message}</p>
            </div>
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                data-testid="coins-balance-retry"
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
