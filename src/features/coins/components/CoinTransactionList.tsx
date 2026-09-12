"use client";

import { ArrowDownLeft, ArrowUpRight, Loader2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api";

import type { CoinReason, CoinTransaction } from "@/features/coins/types/coin.types";

export interface CoinTransactionListProps {
  items: readonly CoinTransaction[];
  isLoading: boolean;
  isPlaceholder: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error: ApiError | null;
  onRetry: () => void;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Human-readable label for a `CoinReason` enum value. We keep the
 * mapping local so the transaction list does not need a translation
 * pipeline — the labels are intentionally short.
 */
const REASON_LABELS: Readonly<Record<CoinReason, string>> = {
  QUIZ_COMPLETION_REWARD: "Quiz completion",
  DAILY_CHALLENGE_REWARD: "Daily challenge",
  TOURNAMENT_REWARD: "Tournament",
  ACHIEVEMENT_REWARD: "Achievement",
  STREAK_BONUS: "Streak bonus",
  ADMIN_CREDIT: "Admin credit",
  TIP_SENT: "Tip sent",
  FLAIR_PURCHASED: "Flair purchase",
  SUPPRESS_RECOMMENDED_PURCHASED: "Suppress recommended",
  ADMIN_DEBIT: "Admin debit",
};

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * `<CoinTransactionList />` — paginated coin ledger.
 *
 * Empty / error / loading / populated states each render a distinct
 * surface so users always know what they're looking at. We never fall
 * back to fake rows.
 */
export function CoinTransactionList({
  items,
  isLoading,
  isPlaceholder,
  hasMore,
  onLoadMore,
  error,
  onRetry,
}: CoinTransactionListProps): React.ReactElement {
  if (error) {
    return (
      <Card data-testid="coins-transactions-error-card">
        <CardContent className="p-6">
          <div
            className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            role="alert"
            data-testid="coins-transactions-error"
          >
            Could not load your transaction history: {error.message}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3"
            data-testid="coins-transactions-retry"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <Card data-testid="coins-transactions-loading-card">
        <CardContent className="p-6 space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`txn-skel-${idx}`}
              className="h-10 rounded bg-muted/60 animate-pulse"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card data-testid="coins-transactions-empty-card">
        <CardContent className="p-2">
          <EmptyState
            icon={Receipt}
            size="md"
            title={
              isPlaceholder
                ? "Coin history is unavailable in preview mode"
                : "No transactions yet"
            }
            description={
              isPlaceholder
                ? "When the coin economy is enabled, your earnings and spend will appear here."
                : "Complete a quiz, finish a daily challenge, or send a tip to see activity here."
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="coins-transactions-card">
      <CardContent className="p-0">
        <ul
          className="divide-y divide-border"
          data-testid="coins-transactions-list"
        >
          {items.map((txn) => (
            <li
              key={txn.transactionId}
              className="flex items-center justify-between gap-3 px-4 py-3"
              data-testid="coins-transaction-row"
              data-reason={txn.reason}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={
                    txn.amount >= 0
                      ? "rounded-full p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                      : "rounded-full p-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                  }
                  aria-hidden="true"
                >
                  {txn.amount >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {REASON_LABELS[txn.reason as CoinReason] ?? txn.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {DATETIME_FORMAT.format(new Date(txn.createdAt))}
                  </p>
                </div>
              </div>
              <div className="text-right tabular-nums">
                <p
                  className={
                    txn.amount >= 0
                      ? "text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                      : "text-sm font-semibold text-rose-700 dark:text-rose-300"
                  }
                  data-testid="coins-transaction-amount"
                >
                  {txn.amount >= 0 ? "+" : ""}
                  {INTEGER_FORMAT.format(txn.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Balance: {INTEGER_FORMAT.format(txn.balanceAfter)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {hasMore ? (
          <div className="flex justify-center p-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
              data-testid="coins-transactions-load-more"
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 mr-1.5 animate-spin"
                    aria-hidden="true"
                  />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
