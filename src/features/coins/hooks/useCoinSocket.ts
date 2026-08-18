"use client";

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

isLive: boolean;

connectionState: UseSocketReturn["connectionState"];

socket: UseSocketReturn["socket"];

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