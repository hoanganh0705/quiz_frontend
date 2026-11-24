"use client";

import { memo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Flame,
  HeartHandshake,
  Loader2,
  Medal,
  Receipt,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CoinReason,
  CoinTransaction,
} from "@/features/coins/types/coin.types";
import type { ApiError } from "@/lib/api";

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
 * Human-readable label for a `CoinReason` enum value.
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

function getTransactionIcon(reason: CoinReason, isPositive: boolean) {
  switch (reason) {
    case "QUIZ_COMPLETION_REWARD":
      return CheckCircle2;
    case "DAILY_CHALLENGE_REWARD":
      return CalendarCheck;
    case "TOURNAMENT_REWARD":
      return Trophy;
    case "ACHIEVEMENT_REWARD":
      return Medal;
    case "STREAK_BONUS":
      return Flame;
    case "TIP_SENT":
      return HeartHandshake;
    case "FLAIR_PURCHASED":
      return Sparkles;
    case "ADMIN_CREDIT":
    case "ADMIN_DEBIT":
      return Coins;
    default:
      return isPositive ? ArrowUpRight : ArrowDownLeft;
  }
}

/**
 * `<CoinTransactionList />` — paginated coin ledger.
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
      <Card
        data-testid="coins-transactions-error-card"
        className="rounded-xl border border-destructive/30 bg-destructive/5"
      >
        <CardContent className="p-6">
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
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
            className="mt-3.5"
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
      <Card
        data-testid="coins-transactions-loading-card"
        className="rounded-xl border border-border/80 bg-card/80"
      >
        <CardContent className="p-6 space-y-2.5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`txn-skel-${idx}`}
              className="h-12 rounded-xl bg-muted/60 animate-pulse motion-reduce:animate-none"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card
        data-testid="coins-transactions-empty-card"
        className="rounded-xl border border-border/80 bg-card/80"
      >
        <CardContent className="p-4 sm:p-6">
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
    <Card
      data-testid="coins-transactions-card"
      className="rounded-xl border border-border/80 bg-card/80 p-0 backdrop-blur-xs shadow-xs"
    >
      <CardContent className="p-0">
        <ul
          className="divide-y divide-border/60"
          data-testid="coins-transactions-list"
        >
          {items.map((txn) => (
            <CoinTransactionRow key={txn.transactionId} txn={txn} />
          ))}
        </ul>

        {hasMore ? (
          <div className="flex justify-center p-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
              data-testid="coins-transactions-load-more"
              className="gap-2 font-medium transition-all duration-200 hover:border-amber-500/40 active:scale-98 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none text-amber-600 dark:text-amber-400" aria-hidden="true" />
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

const CoinTransactionRow = memo(function CoinTransactionRow({
  txn,
}: {
  txn: CoinTransaction;
}) {
  const isPositive = txn.amount >= 0;
  const TxnIcon = getTransactionIcon(txn.reason as CoinReason, isPositive);
  const formattedAmount = INTEGER_FORMAT.format(txn.amount);
  const formattedBalanceAfter = INTEGER_FORMAT.format(txn.balanceAfter);
  const formattedDate = DATETIME_FORMAT.format(new Date(txn.createdAt));
  const reasonLabel = REASON_LABELS[txn.reason as CoinReason] ?? txn.reason;

  return (
    <li
      className="group flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 transition-colors duration-150 hover:bg-muted/40 focus-within:bg-muted/40"
      data-testid="coins-transaction-row"
      data-reason={txn.reason}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={
            isPositive
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition-transform duration-200 group-hover:scale-105"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 transition-transform duration-200 group-hover:scale-105"
          }
          aria-hidden="true"
        >
          <TxnIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">
            {reasonLabel}
          </p>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {formattedDate}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p
          className={
            isPositive
              ? "font-mono text-sm sm:text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
              : "font-mono text-sm sm:text-base font-bold tabular-nums text-rose-700 dark:text-rose-400"
          }
          data-testid="coins-transaction-amount"
          aria-label={
            isPositive
              ? `+${formattedAmount} coins earned`
              : `-${INTEGER_FORMAT.format(Math.abs(txn.amount))} coins spent`
          }
        >
          {isPositive ? "+" : ""}
          {formattedAmount}
        </p>
        <p
          className="font-mono text-xs tabular-nums text-muted-foreground mt-0.5"
          aria-label={`Balance after transaction: ${formattedBalanceAfter} coins`}
        >
          Balance: {formattedBalanceAfter}
        </p>
      </div>
    </li>
  );
});
