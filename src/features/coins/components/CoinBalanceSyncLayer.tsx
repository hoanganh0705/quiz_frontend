"use client";

import { useCoinSocket } from "@/features/coins/hooks/useCoinSocket";

export function CoinBalanceSyncLayer(): null {
  if (false) {
    return null;
  }

  useCoinSocket();

  return null;
}
