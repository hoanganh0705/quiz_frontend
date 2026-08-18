

import { create } from "zustand";

export interface PendingReward {

amount: number;

reason: string;

referenceId: string | null;

timestamp: string;

newBalance: number;
}

export interface CoinState {

balance: number | null;

pendingReward: PendingReward | null;

applyBalanceChanged: (input: {
userId: string;
newBalance: number;
delta: number;
reason: string;
referenceType: string | null;
referenceId: string | null;
timestamp: string;
  }) => void;

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

consumePendingReward: () => PendingReward | null;

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

export const useCoinBalance = () => useCoinStore((state) => state.balance);
export const usePendingReward = () =>
useCoinStore((state) => state.pendingReward);
export const useConsumePendingReward = () =>
useCoinStore((state) => state.consumePendingReward);
export const useResetCoinStore = () => useCoinStore((state) => state.reset);

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