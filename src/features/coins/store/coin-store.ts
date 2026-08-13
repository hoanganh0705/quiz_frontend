/**
 * `coin-store.ts` — Zustand store for the coin-economy realtime cache.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.B2.
 *
 * ## What this store owns
 *
 * The cached `CoinWallet.balance` and the most-recent reward event
 * (`pendingReward`). The store is NOT persisted — when the page
 * reloads, the canonical balance is re-fetched from `GET /coins/wallet`.
 * Persisting a balance would let the client diverge from the
 * server-authoritative ledger and is explicitly out of scope.
 *
 * ## Realtime wiring
 *
 * The `useCoinSocket` hook calls `applyBalanceChanged` /
 * `applyTransactionRecorded` on every `/coins` event. The store
 * mirrors the new balance immediately so the `<CoinBalancePill />`
 * updates without waiting for the SWR revalidation round-trip.
 *
 * The store also exposes `consumePendingReward()` so the
 * `<RewardToast />` can pop the reward singleton without prop
 * drilling — exactly the same discipline as
 * `useUserStore.consumeUser()`.
 */

import { create } from "zustand";

export interface PendingReward {
  /** Server-authoritative delta (positive). */
  amount: number;
  /** Coin reason code (`QUIZ_COMPLETION_REWARD`, `DAILY_CHALLENGE_REWARD`, …). */
  reason: string;
  /** Optional reference id (attempt id, daily-challenge id, …). */
  referenceId: string | null;
  /** Server timestamp the outbox row was processed. */
  timestamp: string;
  /** New balance after the ledger row was applied. */
  newBalance: number;
}

export interface CoinState {
  /** Cached balance, updated optimistically from `/coins` events. */
  balance: number | null;
  /** Most-recent positive reward event for `<RewardToast />`. */
  pendingReward: PendingReward | null;
  /** Apply a `coin:balance_changed` event. */
  applyBalanceChanged: (input: {
    userId: string;
    newBalance: number;
    delta: number;
    reason: string;
    referenceType: string | null;
    referenceId: string | null;
    timestamp: string;
  }) => void;
  /** Apply a `coin:transaction_recorded` event. */
  applyTransactionRecorded: (input: {
    userId: string;
    transactionId: string;
    reason: string;
    amount: number;
    balanceAfter: number;
    referenceType: string | null;
    referenceId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    isReward: boolean;
  }) => void;
  /** Pop the pending reward so the toast does not re-fire on rerender. */
  consumePendingReward: () => PendingReward | null;
  /** Reset the store on logout. */
  reset: () => void;
}

export const useCoinStore = create<CoinState>()((set, get) => ({
  balance: null,
  pendingReward: null,

  applyBalanceChanged: (input) => {
    set({ balance: input.newBalance });
  },

  applyTransactionRecorded: (input) => {
    if (!input.isReward) {
      set({ balance: input.balanceAfter });
      return;
    }

    const reward: PendingReward = {
      amount: input.amount,
      reason: input.reason,
      referenceId: input.referenceId,
      timestamp: input.createdAt,
      newBalance: input.balanceAfter,
    };

    set({ balance: input.balanceAfter, pendingReward: reward });
  },

  consumePendingReward: () => {
    const reward = get().pendingReward;
    if (reward !== null) {
      set({ pendingReward: null });
    }
    return reward;
  },

  reset: () => {
    set({ balance: null, pendingReward: null });
  },
}));

// ─── Selectors ──────────────────────────────────────────────────────────────
//
// Rule: NEVER return an object from a selector. Objects create a new
// reference on every call, which can trigger unnecessary rerenders.
// Primitives and function refs are stable by identity.

export const useCoinBalance = () => useCoinStore((state) => state.balance);
export const usePendingReward = () =>
  useCoinStore((state) => state.pendingReward);
export const useConsumePendingReward = () =>
  useCoinStore((state) => state.consumePendingReward);
export const useResetCoinStore = () => useCoinStore((state) => state.reset);

// ─── Plain-function exports (no React binding) ──────────────────────────────
//
// `useCoinSocket` calls these directly outside of React render
// functions so the listeners stay synchronous to the realtime event.

export function applyBalanceChanged(input: {
  userId: string;
  newBalance: number;
  delta: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  timestamp: string;
}): void {
  useCoinStore.getState().applyBalanceChanged(input);
}

export function applyTransactionRecorded(input: {
  userId: string;
  transactionId: string;
  reason: string;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  isReward: boolean;
}): void {
  useCoinStore.getState().applyTransactionRecorded(input);
}