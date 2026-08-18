'use client';

import { useCallback } from 'react';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
FollowButton,
FollowButtonSkeleton,
type FollowButtonProps,
} from '@/components/primitives';
import { useFollowedLookup } from '@/features/tags';
import { useIsFollowingTag } from '@/features/tags/hooks/useIsFollowingTag';
import { useFollowTag } from '@/features/tags/hooks/useFollowTag';
import { useUnfollowTag } from '@/features/tags/hooks/useUnfollowTag';
import { cn } from '@/shared/utils/merge-class-names';

export interface TagFollowButtonSlotProps {

tagId: string | null;

className?: string;
}

export function TagFollowButtonSlot({
tagId,
className,
}: TagFollowButtonSlotProps): React.ReactElement | null {
const { isAuthenticated } = useAuthState();

const { isFollowing, isLoading } = useIsFollowingTag(tagId);

const { tags: followedTags, isLoading: isLookupLoading } =
useFollowedLookup();
const followCount = followedTags.size;

const { isPending: isFollowPending, lastError: followError, follow } =
useFollowTag(tagId);
const {
isPending: isUnfollowPending,
lastError: unfollowError,
unfollow,
  } = useUnfollowTag(tagId);

const isPending = isFollowPending || isUnfollowPending;

const lastError = followError ?? unfollowError;

const handleToggle = useCallback<FollowButtonProps['onToggle']>(() => {
if (isFollowing) {
void unfollow();
    } else {
void follow();
    }
  }, [isFollowing, follow, unfollow]);

if (tagId === null) {
return null;
  }

if (isLoading) {
return (
<div
data-testid='tag-follow-button-slot'
data-state='loading'
className={cn('flex flex-col items-start', className)}
      >
<FollowButtonSkeleton />
</div>
    );
  }

return (
<div
data-testid='tag-follow-button-slot'
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