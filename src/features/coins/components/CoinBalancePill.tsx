"use client";

import Link from "next/link";
import { Coins, ArrowUpRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useCoinBalance } from "@/features/coins/store/coin-store";
import { useCoinWallet } from "@/features/coins/hooks/useCoinWallet";

export interface CoinBalancePillProps {
  className?: string;
}

function formatBalanceShort(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("en-US");
}

export function CoinBalancePill({ className }: CoinBalancePillProps) {
  const flagValue = getFeatureFlagValue("coin_economy_live");
  const isPlaceholder = flagValue === "placeholder";

  const { balance: walletBalance, isLoading, error } = useCoinWallet();
  const optimisticBalance = useCoinBalance();

  const balance = optimisticBalance ?? walletBalance ?? null;

  if (isPlaceholder) {
    return (
      <div
        className={`flex items-center gap-1.5 p-1.5 sm:p-2 border border-border rounded-lg text-xs sm:text-sm text-muted-foreground ${className ?? ""}`}
        data-testid="coin-balance-pill-placeholder"
        aria-label="Coins feature coming soon"
      >
        <Coins className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>Coming soon</span>
      </div>
    );
  }

  const errorMessage = error ? "—" : null;
  const displayBalance = errorMessage ?? formatBalanceShort(balance);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Coin balance"
          className={`group flex items-center gap-1.5 px-2.5 py-1.5 border border-border/80 rounded-lg bg-card/60 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer shadow-xs ${className ?? ""}`}
          data-testid="coin-balance-pill"
          data-loading={isLoading ? "true" : "false"}
        >
          <Coins
            className="h-4 w-4 text-amber-500 fill-amber-500/20 transition-transform group-hover:scale-110 duration-200"
            aria-hidden="true"
          />
          <span
            className="text-foreground text-xs sm:text-sm font-semibold font-mono tracking-tight"
            data-testid="coin-balance-value"
          >
            {displayBalance}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl border-border/80 shadow-md">
        <DropdownMenuLabel className="flex flex-col gap-1 p-3">
          <span className="text-xs text-muted-foreground font-normal">Available Balance</span>
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            <span className="text-lg font-bold font-mono tracking-tight">
              {balance !== null ? balance.toLocaleString("en-US") : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-normal ml-0.5">Coins</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link
            href="/coins"
            className="flex items-center justify-between gap-2 p-2"
            aria-label="Open coin wallet"
          >
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>Coin Wallet & Ledger</span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
