"use client";

import { useCoinSocket } from "@/features/coins/hooks/useCoinSocket";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export function CoinBalanceSyncLayer(): null {
const flagValue = getFeatureFlagValue("coin_economy_live");
if (flagValue === "placeholder") {
return null;
  }

useCoinSocket();

return null;
}