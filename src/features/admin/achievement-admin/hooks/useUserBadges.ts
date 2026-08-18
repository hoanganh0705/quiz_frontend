'use client';

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import { getUserBadges } from '@/features/achievements/services/achievements.service';
import type { FeaturedBadgeResponseDto } from '@/lib/api/generated/schemas';

import { validateUserId } from '../validation';

export interface UseUserBadgesResult {

readonly badges: readonly FeaturedBadgeResponseDto[];

readonly isLoading: boolean;

readonly error: ApiError | null;

readonly mutate: () => void;
}

export function useUserBadges(
userId: string | null,
): UseUserBadgesResult {
const flagValue = getFeatureFlagValue('admin_achievement_live');
const isFlagPlaceholder = flagValue === 'placeholder';

const isDisabled = isFlagPlaceholder || userId === null || validateUserId(userId).ok === false;

const key = useMemo(
() =>
isDisabled
? (['admin', 'achievement', 'user-badges', 'disabled'] as const)
: (['admin', 'achievement', 'user-badges', userId] as const),
[isDisabled, userId],
  );

const fetcher = useCallback(async () => {
if (isDisabled) return [] as Array<FeaturedBadgeResponseDto>;
const profile = await getUserBadges(userId!);
return (profile.featuredBadges ?? []) as Array<FeaturedBadgeResponseDto>;
  }, [isDisabled, userId]);

const { data, error, isLoading, mutate } = useSWR<
Array<FeaturedBadgeResponseDto>,
ApiError
  >(key, fetcher, {
revalidateOnFocus: false,
revalidateOnReconnect: true,
  });

return {
badges: data ?? [],
isLoading,
error: error ?? null,
mutate,
  };
}
