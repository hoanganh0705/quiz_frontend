"use client";

/**
 * `CoinsLandingPage` — the route component for `/coins`.
 *
 * Layout (top → bottom):
 *   1. `<CoinsBalanceCard />`           — live balance, lifetime earned/spent
 *   2. `<CoinEarningsSummary />`        — quick read on income vs. spend
 *   3. `<CoinTransactionList />`        — full ledger with cursor pagination
 */

import Link from "next/link";
import {
  Coins,
  Loader2,
  Receipt,
  TrendingUp,
  Sparkles,
  Trophy,
  ArrowUpRight,
  HeartHandshake,
  Gamepad2,
  RotateCcw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCoinTransactions } from "@/features/coins/hooks/useCoinTransactions";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";

import { CoinEarningsSummary } from "./CoinEarningsSummary";
import { CoinsBalanceCard } from "./CoinsBalanceCard";
import { CoinTransactionList } from "./CoinTransactionList";

export interface CoinsLandingPageProps {
  className?: string;
}

export function CoinsLandingPage({
  className,
}: CoinsLandingPageProps): React.ReactElement {
  const {
    wallet,
    balance,
    isLoading: isWalletLoading,
    isPlaceholder,
    error: walletError,
    refresh: refreshWallet,
  } = useCoinWallet();
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
      <header className="w-full px-4 md:px-8 lg:px-12 pt-4 md:pt-8 lg:pt-12 pb-5 border-b border-border/40 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 shadow-xs">
              <Coins className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Coins
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your wallet balance, lifetime earnings, and transaction history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isLoading ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 font-mono text-muted-foreground"
                data-testid="coins-loading-pill"
              >
                <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Syncing…
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void refreshWallet();
                  void refresh();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1 font-mono text-xs font-medium text-muted-foreground backdrop-blur-xs transition-colors hover:border-amber-500/40 hover:text-foreground cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Refresh wallet and transaction ledger"
              >
                <RotateCcw className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Sync</span>
              </button>
            )}
            {isPlaceholderMode ? (
              <span
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200"
                data-testid="coins-placeholder-pill"
              >
                Preview mode
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 lg:px-12 pb-12 space-y-8">
        {/* Top Financial Position Deck: Balance Hero (5-col) + Lifetime Earnings Overview (7-col) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <section
            aria-labelledby="coins-balance-heading"
            data-testid="coins-balance-section"
            className="lg:col-span-5 flex flex-col"
          >
            <h2 id="coins-balance-heading" className="sr-only">
              Balance
            </h2>
            <CoinsBalanceCard
              balance={balance}
              isLoading={isWalletLoading}
              isPlaceholder={isPlaceholder}
              error={walletError}
              onRetry={() => void refreshWallet()}
              className="h-full"
            />
          </section>

          <section
            aria-labelledby="coins-earnings-heading"
            data-testid="coins-earnings-section"
            className="lg:col-span-7 flex flex-col"
          >
            <h2 id="coins-earnings-heading" className="sr-only">
              Earnings Overview
            </h2>
            <CoinEarningsSummary
              isPlaceholder={isPlaceholder}
              isLoading={isWalletLoading}
              lifetimeEarned={wallet?.lifetimeEarned ?? null}
              lifetimeSpent={wallet?.lifetimeSpent ?? null}
              className="h-full"
            />
          </section>
        </div>

        {/* 12-Column Responsive Layout: 8-Column Ledger + 4-Column Economy Companion Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column: Transaction History Ledger */}
          <section
            aria-labelledby="coins-ledger-heading"
            data-testid="coins-ledger-section"
            className="lg:col-span-8 space-y-4"
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h2
                id="coins-ledger-heading"
                className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
              >
                <Receipt className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <span>Transaction History</span>
              </h2>
              {items.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                  {items.length} records
                </span>
              ) : null}
            </div>
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

          {/* Companion Sidebar: Coin Rewards & Utilities */}
          <aside className="lg:col-span-4 space-y-6" aria-label="Coin economy guide">
            {/* Card 1: How to Earn Coins */}
            <Card className="rounded-xl border bg-card/80 p-5 backdrop-blur-xs shadow-xs transition-colors hover:border-border">
              <CardHeader className="p-0 pb-3.5">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>How to Earn Coins</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3 text-xs text-muted-foreground">
                <Link
                  href="/daily-challenge"
                  className="group flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-amber-500/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 transition-transform group-hover:scale-105">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Daily Challenges</p>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </div>
                    <p className="line-clamp-2">Complete your daily challenge to unlock recurring streak bonuses.</p>
                  </div>
                </Link>

                <Link
                  href="/tournaments"
                  className="group flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-emerald-500/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition-transform group-hover:scale-105">
                    <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Tournaments</p>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </div>
                    <p className="line-clamp-2">Compete in bracket tournaments to claim coin pool prizes.</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Card 2: Where to Spend */}
            <Card className="rounded-xl border bg-card/80 p-5 backdrop-blur-xs shadow-xs transition-colors hover:border-border">
              <CardHeader className="p-0 pb-3.5">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <HeartHandshake className="h-4 w-4 text-rose-500" aria-hidden="true" />
                  <span>Ways to Spend</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2.5 text-xs text-muted-foreground">
                <Link
                  href="/quizzes"
                  className="group block rounded-lg border border-border/60 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-brand/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground group-hover:text-brand transition-colors">Tip Quiz Authors</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </div>
                  <p className="mt-0.5 line-clamp-2">Send appreciation tips (10–500 coins) to authors after finishing quizzes you enjoyed.</p>
                </Link>

                <Link
                  href="/settings"
                  className="group block rounded-lg border border-border/60 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-violet-500/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Profile Flair & Cosmetics</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </div>
                  <p className="mt-0.5 line-clamp-2">Unlock avatar border flairs and titles in Settings to stand out on global leaderboards.</p>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
