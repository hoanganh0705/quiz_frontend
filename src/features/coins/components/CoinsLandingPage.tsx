"use client";

/**
 * `CoinsLandingPage` — the route component for `/coins`.
 *
 * Phase 5.2 — Coins landing page.
 *
 * Layout (top → bottom):
 *   1. `<CoinsBalanceCard />`           — live balance, lifetime earned/spent
 *   2. `<CoinEarningsSummary />`        — quick read on income vs. spend
 *   3. `<TipAuthorForm />`              — send a tip to a user
 *   4. `<FlairEquipForm />`             — spend coins to equip a badge as flair
 *   5. `<CoinTransactionList />`        — full ledger with cursor pagination
 *
 * Feature-flag handling: when `coin_economy_live === "placeholder"`,
 * `useCoinWallet` returns the `PLACEHOLDER_WALLET` shape (balance = 0, no
 * network) and `useCoinTransactions` returns an empty list — the page
 * still renders, but every action is disabled and the wallet summary
 * shows "—". This matches the existing placeholder behaviour for the
 * `CoinBalancePill` and keeps the page safe in environments where the
 * coin economy is gated off.
 */

import { Coins, Loader2, Receipt, Sparkles, TrendingUp, Wallet } from "lucide-react";

import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";
import { useCoinTransactions } from "@/features/coins/hooks/useCoinTransactions";

import { CoinsBalanceCard } from "./CoinsBalanceCard";
import { CoinEarningsSummary } from "./CoinEarningsSummary";
import { CoinTransactionList } from "./CoinTransactionList";
import { TipAuthorForm } from "./TipAuthorForm";
import { FlairEquipForm } from "./FlairEquipForm";

export interface CoinsLandingPageProps {
  className?: string;
}

export function CoinsLandingPage({
  className,
}: CoinsLandingPageProps): React.ReactElement {
  const { balance, isLoading: isWalletLoading, isPlaceholder, error: walletError } =
    useCoinWallet();
  const {
    items,
    isLoading: isTransactionsLoading,
    hasMore,
    loadMore,
    error: transactionsError,
    refresh,
    isPlaceholder: transactionsPlaceholder,
  } = useCoinTransactions();

  const isPlaceholderMode = isPlaceholder || transactionsPlaceholder;
  const isLoading = isWalletLoading || isTransactionsLoading;

  return (
    <div
      className={className}
      data-testid="coins-landing-page"
      data-placeholder={isPlaceholderMode ? "true" : "false"}
    >
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Coins
                className="h-6 w-6 sm:h-7 sm:h-7 text-amber-500"
                aria-hidden="true"
              />
              Coins
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your balance, earnings, and spending controls.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isLoading ? (
              <span
                className="inline-flex items-center gap-1"
                data-testid="coins-loading-pill"
              >
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Syncing…
              </span>
            ) : null}
            {isPlaceholderMode ? (
              <span
                className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5"
                data-testid="coins-placeholder-pill"
              >
                Preview mode
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-12 max-w-5xl mx-auto space-y-6">
        {/* 1. Balance card */}
        <section
          aria-labelledby="coins-balance-heading"
          data-testid="coins-balance-section"
        >
          <h2 id="coins-balance-heading" className="sr-only">
            Balance
          </h2>
          <CoinsBalanceCard
            balance={balance}
            isLoading={isWalletLoading}
            isPlaceholder={isPlaceholder}
            error={walletError}
          />
        </section>

        {/* 2. Earnings summary */}
        <section
          aria-labelledby="coins-earnings-heading"
          data-testid="coins-earnings-section"
        >
          <h2
            id="coins-earnings-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Earnings
          </h2>
          <CoinEarningsSummary
            isPlaceholder={isPlaceholder}
            isLoading={isWalletLoading}
          />
        </section>

        {/* 3 + 4. Spend forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            aria-labelledby="coins-tip-heading"
            data-testid="coins-tip-section"
          >
            <h2
              id="coins-tip-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Send a tip
            </h2>
            <TipAuthorForm
              currentBalance={balance}
              isPlaceholder={isPlaceholderMode}
            />
          </section>

          <section
            aria-labelledby="coins-flair-heading"
            data-testid="coins-flair-section"
          >
            <h2
              id="coins-flair-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Equip flair
            </h2>
            <FlairEquipForm
              currentBalance={balance}
              isPlaceholder={isPlaceholderMode}
            />
          </section>
        </div>

        {/* 5. Transaction ledger */}
        <section
          aria-labelledby="coins-ledger-heading"
          data-testid="coins-ledger-section"
        >
          <h2
            id="coins-ledger-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Transactions
          </h2>
          <CoinTransactionList
            items={items}
            isLoading={isTransactionsLoading}
            isPlaceholder={transactionsPlaceholder}
            hasMore={hasMore}
            onLoadMore={loadMore}
            error={transactionsError}
            onRetry={() => void refresh()}
          />
        </section>
      </main>
    </div>
  );
}
