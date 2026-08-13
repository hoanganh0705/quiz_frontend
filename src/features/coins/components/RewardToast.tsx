"use client";

/**
 * `<RewardToast />` — top-of-page toast for positive coin rewards.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.D2.
 *
 * Listens to the `useCoinStore` `pendingReward` singleton and pushes a
 * toast via the shared `useToast()` surface. The singleton is
 * consumed atomically (`consumePendingReward`) so re-renders do not
 * re-fire the same toast.
 *
 * The component renders no DOM of its own — it is purely a controller
 * that maps the realtime signal to the existing toast viewport.
 */

import { useEffect } from "react";
import { Coins } from "lucide-react";

import { useToast, DEFAULT_TOAST_DURATION_MS } from "@/lib/forms/useToast";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
  usePendingReward,
  useConsumePendingReward,
} from "@/features/coins/store/coin-store";
import type { PendingReward } from "@/features/coins/store/coin-store";

/**
 * Human-readable copy for each reward reason. Falls back to a generic
 * "+N coins" string when the reason is unknown.
 */
const REASON_COPY: Readonly<Record<string, { title: string; body: (a: number) => string }>> = {
  QUIZ_COMPLETION_REWARD: {
    title: 'Quiz reward',
    body: (a) => `+${a} coins for completing a quiz.`,
  },
  DAILY_CHALLENGE_REWARD: {
    title: 'Daily challenge',
    body: (a) => `+${a} coins for today's daily challenge.`,
  },
  TOURNAMENT_REWARD: {
    title: 'Tournament reward',
    body: (a) => `+${a} coins from a tournament payout.`,
  },
  ACHIEVEMENT_REWARD: {
    title: 'Achievement unlocked',
    body: (a) => `+${a} coins for unlocking an achievement.`,
  },
  STREAK_BONUS: {
    title: 'Streak bonus',
    body: (a) => `+${a} coins for keeping your streak alive.`,
  },
  ADMIN_CREDIT: {
    title: 'Coin credit',
    body: (a) => `+${a} coins credited by an admin.`,
  },
};

function formatReward(reward: PendingReward): { title: string; body: string } {
  const copy = REASON_COPY[reward.reason];
  if (!copy) {
    return {
      title: 'Coin reward',
      body: `+${reward.amount} coins`,
    };
  }
  return { title: copy.title, body: copy.body(reward.amount) };
}

export interface RewardToastProps {
  /** Custom duration in ms; defaults to the shared 5 s. */
  durationMs?: number;
}

export function RewardToast({ durationMs = DEFAULT_TOAST_DURATION_MS }: RewardToastProps) {
  const flagValue = getFeatureFlagValue('coin_economy_live');
  const isPlaceholder = flagValue === 'placeholder';
  const pendingReward = usePendingReward();
  const consume = useConsumePendingReward();
  const { push } = useToast();

  useEffect(() => {
    if (isPlaceholder) return;
    if (pendingReward === null) return;
    const reward = consume();
    if (reward === null) return;
    const { title, body } = formatReward(reward);
    push({
      title,
      body,
      durationMs,
    });
    // consume is a stable zustand selector — not in deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReward, isPlaceholder, push, durationMs]);

  return null;
}