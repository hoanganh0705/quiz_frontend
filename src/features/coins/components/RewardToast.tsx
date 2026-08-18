"use client";

import { useEffect } from "react";
import { Coins } from "lucide-react";

import { useToast, DEFAULT_TOAST_DURATION_MS } from "@/lib/forms/useToast";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
usePendingReward,
useConsumePendingReward,
} from "@/features/coins/store/coin-store";
import type { PendingReward } from "@/features/coins/store/coin-store";

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