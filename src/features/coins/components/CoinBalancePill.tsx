"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

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
className={`flex items-center gap-1.5 p-1.5 sm:p-2 border border-border rounded-md text-xs sm:text-sm text-muted-foreground ${className ?? ""}`}
data-testid="coin-balance-pill-placeholder"
aria-label="Coins feature coming soon"
      >
<Coins className="h-4 w-4" aria-hidden="true" />
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
className={`flex items-center gap-1.5 p-1.5 sm:p-2 border border-border rounded-md hover:bg-main-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className ?? ""}`}
data-testid="coin-balance-pill"
data-loading={isLoading ? "true" : "false"}
        >
<Coins
className="h-4 w-4 text-amber-500"
aria-hidden="true"
          />
<span
className="text-foreground text-xs sm:text-sm font-medium tabular-nums"
data-testid="coin-balance-value"
          >
{displayBalance}
</span>
</button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" sideOffset={8} className="w-56">
<DropdownMenuLabel className="flex flex-col gap-1">
<span className="text-xs text-muted-foreground">Coin balance</span>
<span className="text-base font-semibold tabular-nums">
{balance !== null ? balance.toLocaleString("en-US") : "—"}
</span>
</DropdownMenuLabel>
<DropdownMenuSeparator />
<DropdownMenuItem asChild>
<Link
href="/coins"
className="flex items-center gap-2"
aria-label="Open coin ledger"
          >
<Coins className="h-4 w-4" aria-hidden="true" />
<span>View ledger</span>
</Link>
</DropdownMenuItem>
<DropdownMenuItem asChild>
<Link
href="/coins/transactions"
className="flex items-center gap-2"
aria-label="Open coin transactions"
          >
<span>Transactions</span>
</Link>
</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
  );
}