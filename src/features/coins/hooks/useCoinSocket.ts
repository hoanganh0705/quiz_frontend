"use client";

/**
 * `useCoinSocket` — `/coins` Socket.IO connection + listener hook.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.B2.
 *
 * ## What this hook owns
 *
 * - Opens an authenticated Socket.IO connection to the `/coins`
 *   namespace while `coin_economy_live === 'live'` AND
 *   `realtime_infrastructure_live === 'live'`. When either flag is
 *   `'placeholder'`, the connection is suppressed entirely.
 * - Exposes the live socket, the connection state, and the last WS
 *   error so consumers (`<CoinBalancePill />`, `<RewardToast />`) can
 *   react to lifecycle transitions.
 * - Forwards `coin:balance_changed` and `coin:transaction_recorded`
 *   events:
 *
 *     1. Calls `useCoinStore` reducers so the cached balance and the
 *        most-recent-reward singleton are updated without a round
 *        trip.
 *     2. Revalidates the SWR keys for the wallet and the ledger so
 *        the next render reflects server-authoritative state.
 *     3. Broadcasts a Phase 5 cross-tab invalidation (`{ type:
 *        'coin' }`) so sibling tabs refresh without opening their own
 *        sockets.
 *
 * ## Mounted once
 *
 * The Socket.IO connection is owned by `useSocket`'s internal
 * singleton (`ConnectionRegistry`) — calling this hook from multiple
 * components does NOT open multiple sockets. The hook is safe to
 * mount from the `<CoinBalancePill />`, the `<CoinBalanceSyncLayer
 * />`, the tip button, and the flair control simultaneously.
 *
 * ## Feature flag preconditions
 *
 * This hook requires `realtime_infrastructure_live === 'live'`. When
 * either flag is `'placeholder'`, the socket connection is
 * suppressed and the hook returns an `'idle'` connection state.
 */

import { useCallback, useEffect, useMemo } from "react";
import { mutate as globalMutate } from "swr";

import {
  COINS_NAMESPACE,
  COIN_BALANCE_CHANGED,
  COIN_TRANSACTION_RECORDED,
  emitPhase5Invalidation,
  useSocket,
  useRealtimeEvent,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { COIN_CACHE_KEYS } from "@/features/coins/types/coin.types";
import {
  applyBalanceChanged,
  applyTransactionRecorded,
} from "@/features/coins/store/coin-store";

export interface UseCoinSocketResult {
  /** Whether the socket is currently usable (connected and authenticated). */
  isLive: boolean;
  /** Connection state machine value. */
  connectionState: UseSocketReturn["connectionState"];
  /** Raw socket instance — exposed for advanced consumers. */
  socket: UseSocketReturn["socket"];
  /** Last WS error, if any. */
  error: UseSocketReturn["error"];
  reconnect: UseSocketReturn["reconnect"];
  disconnect: UseSocketReturn["disconnect"];
}

const POSITIVE_DELTA_REASONS: ReadonlySet<string> = new Set([
  'QUIZ_COMPLETION_REWARD',
  'DAILY_CHALLENGE_REWARD',
  'TOURNAMENT_REWARD',
  'ACHIEVEMENT_REWARD',
  'STREAK_BONUS',
  'ADMIN_CREDIT',
]);

export function useCoinSocket(): UseCoinSocketResult {
  const coinFlag = getFeatureFlagValue("coin_economy_live");
  const realtimeFlag = getFeatureFlagValue("realtime_infrastructure_live");
  const coinLive = coinFlag === "live";
  const realtimeLive = realtimeFlag === "live";
  const enabled = coinLive && realtimeLive;

  const { socket, connectionState, error, reconnect, disconnect } = useSocket(
    COINS_NAMESPACE,
    { autoConnect: enabled, enabled },
  );

  const isLive = enabled && connectionState === "connected";

  // Stable invalidators — memoised so the listener registration does
  // not thrash on every render.
  const invalidateWallet = useCallback(() => {
    void globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "coins" &&
        key[1] === "wallet",
      undefined,
      { revalidate: true },
    );
  }, []);

  const invalidateTransactions = useCallback(() => {
    void globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "coins" &&
        key[1] === "transactions",
      undefined,
      { revalidate: true },
    );
  }, []);

  const handleBalanceChanged = useCallback(
    (raw: unknown) => {
      const payload = raw as {
        userId?: string;
        newBalance?: number;
        delta?: number;
        reason?: string;
        referenceType?: string | null;
        referenceId?: string | null;
        timestamp?: string;
      };

      if (
        typeof payload.userId !== "string" ||
        typeof payload.newBalance !== "number" ||
        typeof payload.delta !== "number" ||
        typeof payload.reason !== "string"
      ) {
        return;
      }

      applyBalanceChanged({
        userId: payload.userId,
        newBalance: payload.newBalance,
        delta: payload.delta,
        reason: payload.reason,
        referenceType: payload.referenceType ?? null,
        referenceId: payload.referenceId ?? null,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      });

      invalidateWallet();
      emitPhase5Invalidation({ type: "coin" });
    },
    [invalidateWallet],
  );

  const handleTransactionRecorded = useCallback(
    (raw: unknown) => {
      const payload = raw as {
        userId?: string;
        transactionId?: string;
        reason?: string;
        amount?: number;
        balanceAfter?: number;
        referenceType?: string | null;
        referenceId?: string | null;
        metadata?: Record<string, unknown> | null;
        createdAt?: string;
      };

      if (
        typeof payload.userId !== "string" ||
        typeof payload.transactionId !== "string" ||
        typeof payload.reason !== "string" ||
        typeof payload.amount !== "number" ||
        typeof payload.balanceAfter !== "number" ||
        typeof payload.createdAt !== "string"
      ) {
        return;
      }

      const isReward = POSITIVE_DELTA_REASONS.has(payload.reason);

      applyTransactionRecorded({
        userId: payload.userId,
        transactionId: payload.transactionId,
        reason: payload.reason,
        amount: payload.amount,
        balanceAfter: payload.balanceAfter,
        referenceType: payload.referenceType ?? null,
        referenceId: payload.referenceId ?? null,
        metadata: payload.metadata ?? null,
        createdAt: payload.createdAt,
        isReward,
      });

      invalidateTransactions();
      emitPhase5Invalidation({ type: "coin" });
    },
    [invalidateTransactions],
  );

  useRealtimeEvent(socket, enabled ? COIN_BALANCE_CHANGED : null, handleBalanceChanged, {
    enabled: enabled && connectionState === "connected",
  });
  useRealtimeEvent(
    socket,
    enabled ? COIN_TRANSACTION_RECORDED : null,
    handleTransactionRecorded,
    { enabled: enabled && connectionState === "connected" },
  );

  // Cross-tab listener — when a sibling tab broadcasts a Phase 5
  // `coin` invalidation, refetch the local caches. Same-tab filtering
  // is done by `emitPhase5Invalidation` so this listener never fires
  // for our own writes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("realtime/invalidation");
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: string };
      if (data?.type !== "coin") return;
      invalidateWallet();
      invalidateTransactions();
    };
    channel.addEventListener("message", listener);
    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
    };
  }, [invalidateWallet, invalidateTransactions]);

  return useMemo(
    () => ({
      isLive,
      connectionState,
      socket,
      error,
      reconnect,
      disconnect,
    }),
    [isLive, connectionState, socket, error, reconnect, disconnect],
  );
}