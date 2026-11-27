"use client";

import { useCoinSocket } from "@/features/coins/hooks/useCoinSocket";

export function CoinBalanceSyncLayer(): null {
  useCoinSocket();

  return null;
}
