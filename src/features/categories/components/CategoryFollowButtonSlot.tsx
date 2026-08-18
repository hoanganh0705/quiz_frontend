'use client';

import { useCallback } from 'react';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
FollowButton,
FollowButtonSkeleton,
type FollowButtonProps,
} from '@/components/primitives';
import { useFollowedLookup } from '@/features/tags';
import { useIsFollowingCategory } from '@/features/categories/hooks/useIsFollowingCategory';
import { useFollowCategory } from '@/features/categories/hooks/useFollowCategory';
import { useUnfollowCategory } from '@/features/categories/hooks/useUnfollowCategory';
import { cn } from '@/shared/utils/merge-class-names';

export interface CategoryFollowButtonSlotProps {

categoryId: string | null;

className?: string;
}

export function CategoryFollowButtonSlot({
categoryId,
className,
}: CategoryFollowButtonSlotProps): React.ReactElement | null {
const { isAuthenticated } = useAuthState();

const { isFollowing, isLoading } = useIsFollowingCategory(categoryId);

const { categories: followedCategories, isLoading: isLookupLoading } =
useFollowedLookup();
const followCount = followedCategories.size;

const { isPending: isFollowPending, lastError: followError, follow } =
useFollowCategory(categoryId);
const {
isPending: isUnfollowPending,
lastError: unfollowError,
unfollow,
  } = useUnfollowCategory(categoryId);

const isPending = isFollowPending || isUnfollowPending;

const lastError = followError ?? unfollowError;

const handleToggle = useCallback<FollowButtonProps['onToggle']>(() => {
if (isFollowing) {
void unfollow();
    } else {
void follow();
    }
  }, [isFollowing, follow, unfollow]);

if (categoryId === null) {
return null;
  }

if (isLoading) {
return (
<div
data-testid='category-follow-button-slot'
data-state='loading'
className={cn('flex flex-col items-start', className)}
      >
<FollowButtonSkeleton />
</div>
    );
  }

return (
<div
data-testid='category-follow-button-slot'
data-state='resolved'
data-following={isFollowing ? 'true' : 'false'}
className={cn('flex flex-col items-start', className)}
    >
<FollowButton
isFollowing={isFollowing}
isAuthenticated={isAuthenticated}
isPending={isPending}
errorKind={lastError?.kind ?? null}
onToggle={handleToggle}
      />
<span
data-testid='follow-count'
data-count={String(followCount)}
data-loading={isLookupLoading ? 'true' : 'false'}
className='mt-1 text-xs text-muted-foreground tabular-nums'
      >
{`${followCount} follower${followCount === 1 ? '' : 's'}`}
</span>
</div>
  );
}