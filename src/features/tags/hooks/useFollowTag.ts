'use client';

import { useCallback } from 'react';

import {
type OptimisticToggleError,
useOptimisticToggle,
} from '@/lib/api';
import { followedTagsKey } from '@/features/tags/hooks/useFollowedLookup';
import { followTag } from '@/features/tags/services/tags.service';

export interface UseFollowTagResult {
isPending: boolean;
lastError: OptimisticToggleError | null;
follow: () => Promise<void>;
unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
return;
};

export function useFollowTag(id: string | null): UseFollowTagResult {
const keysToInvalidate = id
? ([
followedTagsKey(),
['tag', id],
      ] as const)
: [];

const { status, lastError, toggle } = useOptimisticToggle({
currentValue: false,
toggle: id
? () => followTag(id)
: () => Promise.resolve(),
keysToInvalidate,
  });

const follow = useCallback(async (): Promise<void> => {
if (id === null) {
return NOOP();
    }
await toggle();
  }, [id, toggle]);

return {
isPending: status === 'pending',
lastError,
follow,
unfollow: NOOP,
  };
}