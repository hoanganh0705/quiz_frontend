"use client";

/**
 * `<CoinBalanceSyncLayer />` — renderless mount-point for the
 * `/coins` Socket.IO subscription.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.B3.
 *
 * Mirrors the discipline of `<BadgeSyncLayer />` (Epic 6.10):
 *
 *   - Renders nothing visually (side-effect-only shell).
 *   - Mounts `useCoinSocket` so the realtime balance updates, ledger
 *     prepends, and reward-toast signals flow even when no other
 *     coin-economy component is mounted.
 *   - Returns `null` when `coin_economy_live` is `'placeholder'`,
 *     so a disabled environment renders no extra nodes in the tree.
 *
 * Mount this once near the app root (alongside
 * `<BadgeSyncLayer />`). Multiple mounts are safe — `useSocket` is
 * backed by a singleton — but unnecessary.
 */

import { useCoinSocket } from "@/features/coins/hooks/useCoinSocket";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export function CoinBalanceSyncLayer(): null {
  const flagValue = getFeatureFlagValue("coin_economy_live");
  if (flagValue === "placeholder") {
    return null;
  }

  // Mount the socket subscription + cross-tab listener. The hook
  // short-circuits when either flag is `'placeholder'`.
  useCoinSocket();

  return null;
}