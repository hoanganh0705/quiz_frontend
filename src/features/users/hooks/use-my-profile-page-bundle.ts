'use client'

import { useMemo, useState } from 'react';
import { useUser } from '@/features/users/store/user-store';
import { useMyProfileBundle } from './use-my-profile-bundle';
import type { Player } from '@/features/users/types';
import { getActivityIcon } from '@/features/users/lib/activity-type-icon';

export function useMyProfileBundlePage() {
const [activeTab, setActiveTab] = useState('overview');
const user = useUser();
const bundle = useMyProfileBundle();

const summary = bundle.summary;

const currentUser: Player | null = user
? {
id: user.userId,
rank: 0,
avatarUrl: user.avatarUrl ?? summary?.avatarUrl ?? undefined,
name: user.displayName ?? user.username ?? user.email ?? 'User',
streak: summary?.currentStreak ?? user.currentStreak,
score: undefined,
level: summary?.level,
levelString: summary?.levelTitle,
badge: undefined,
earned: undefined,
followers: summary?.followers,
following: summary?.following,
      }
: null;

const recentActivities: ReadonlyArray<{
id: string;
icon: ReturnType<typeof getActivityIcon>;
title: string;
date: string;
  }> = bundle.recentActivity.map((item) => ({
id: item.id,
icon: getActivityIcon(item.type),
title: item.type,
date: item.at,
  }));

const currentLevelXP = summary?.currentLevelXP ?? 0;
const nextLevelXP = summary?.nextLevelXP ?? 0;
const levelProgress = summary?.xpProgressPercent ?? 0;

return useMemo(
() => ({
bundle,
activeTab,
setActiveTab,
currentUser,
me: user,
summary,
joinedAt: summary?.createdAt ?? null,
isLoading: bundle.isLoading,
recentActivities,
currentLevelXP,
nextLevelXP,
levelProgress,
    }),
[
bundle,
activeTab,
currentUser,
user,
summary,
recentActivities,
currentLevelXP,
nextLevelXP,
levelProgress,
    ],
  );
}