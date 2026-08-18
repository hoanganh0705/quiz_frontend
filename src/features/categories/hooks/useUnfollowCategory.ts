'use client';

import { useCallback } from 'react';

import {
type OptimisticToggleError,
useOptimisticToggle,
} from '@/lib/api';
import { followedCategoriesKey } from '@/features/tags/hooks/useFollowedLookup';
import { unfollowCategory } from '@/features/categories/services/categories.service';

export interface UseUnfollowCategoryResult {

isPending: boolean;

lastError: OptimisticToggleError | null;

follow: () => Promise<void>;

unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
return;
};

export function useUnfollowCategory(
id: string | null,
): UseUnfollowCategoryResult {
const keysToInvalidate = id
? ([
followedCategoriesKey(),
['category', id],
      ] as const)
: [];

const { status, lastError, toggle } = useOptimisticToggle({
currentValue: true,
toggle: id
? () => unfollowCategory(id)
: () => Promise.resolve(),
keysToInvalidate,
  });

const unfollow = useCallback(async (): Promise<void> => {
if (id === null) {
return NOOP();
    }
await toggle();
  }, [id, toggle]);

return {
isPending: status === 'pending',
lastError,
follow: NOOP,
unfollow,
  };
}