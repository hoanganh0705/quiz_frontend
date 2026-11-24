"use client";

import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";

export interface CoinEarningsSummaryProps {
  isPlaceholder: boolean;
  isLoading: boolean;
  lifetimeEarned?: number | null;
  lifetimeSpent?: number | null;
  className?: string;
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
  lifetimeEarned,
  lifetimeSpent,
  className,
}: CoinEarningsSummaryProps): React.ReactElement {
  const fallbackWallet = useCoinWallet();

  const earned =
    lifetimeEarned !== undefined
      ? lifetimeEarned
      : (fallbackWallet.wallet?.lifetimeEarned ?? null);
  const spent =
    lifetimeSpent !== undefined
      ? lifetimeSpent
      : (fallbackWallet.wallet?.lifetimeSpent ?? null);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 h-full ${className ?? ""}`}>
      <Card
        data-testid="coins-earned-card"
        className="group rounded-xl border border-emerald-500/20 bg-card/80 p-0 backdrop-blur-xs shadow-xs transition-all duration-200 hover:border-emerald-500/40 hover:shadow-xs flex flex-col justify-between h-full"
      >
        <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lifetime earned
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition-colors group-hover:bg-emerald-500/15">
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            <p
              className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground"
              data-testid="coins-earned-value"
              aria-label={
                earned !== null && !isPlaceholder
                  ? `${INTEGER_FORMAT.format(earned)} lifetime coins earned`
                  : undefined
              }
            >
              {isLoading && earned === null ? (
                <span
                  className="inline-flex items-center gap-2 text-muted-foreground"
                  aria-label="Loading lifetime earned"
                >
                  <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  …
                </span>
              ) : isPlaceholder || earned === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                INTEGER_FORMAT.format(earned)
              )}
            </p>
            {!isLoading && earned !== null && !isPlaceholder ? (
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                coins
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total rewards accumulated from all activities
          </p>
        </CardContent>
      </Card>

      <Card
        data-testid="coins-spent-card"
        className="group rounded-xl border border-rose-500/20 bg-card/80 p-0 backdrop-blur-xs shadow-xs transition-all duration-200 hover:border-rose-500/40 hover:shadow-xs flex flex-col justify-between h-full"
      >
        <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lifetime spent
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 transition-colors group-hover:bg-rose-500/15">
              <ArrowDownLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:translate-y-0.5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            <p
              className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground"
              data-testid="coins-spent-value"
              aria-label={
                spent !== null && !isPlaceholder
                  ? `${INTEGER_FORMAT.format(spent)} lifetime coins spent`
                  : undefined
              }
            >
              {isLoading && spent === null ? (
                <span
                  className="inline-flex items-center gap-2 text-muted-foreground"
                  aria-label="Loading lifetime spent"
                >
                  <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  …
                </span>
              ) : isPlaceholder || spent === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                INTEGER_FORMAT.format(spent)
              )}
            </p>
            {!isLoading && spent !== null && !isPlaceholder ? (
              <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                coins
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total coins spent on author tips and profile flair
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
