'use client';

import { Button } from '@/components/ui/Button';
import type { OptimisticToggleErrorKind } from '@/lib/api';
import { cn } from '@/shared/utils/merge-class-names';

import { FollowErrorNotice } from './FollowErrorNotice';

const SIGN_IN_TOOLTIP = 'Sign in to follow';

const FOLLOWING_TEST_ID = 'follow-button-following';
const NOT_FOLLOWING_TEST_ID = 'follow-button-not-following';
const SIGN_IN_TEST_ID = 'follow-button-signin-tooltip';

const BUTTON_BASE =
'h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export interface FollowButtonProps {

isFollowing: boolean;

isAuthenticated: boolean;

isPending: boolean;

errorKind: OptimisticToggleErrorKind | null;

onToggle: () => void;

label?: string;

className?: string;
}

function resolveVisualState(
isFollowing: boolean,
isAuthenticated: boolean,
isPending: boolean,
): {
disabled: boolean
ariaBusy: boolean
text: string
variant: 'default' | 'secondary'
testId: string
ariaPressed: boolean | undefined
title: string | undefined
ariaDescribedBy: string | undefined
} {

if (!isAuthenticated) {
return {
disabled: true,
ariaBusy: false,
text: 'Follow',
variant: 'default',
testId: SIGN_IN_TEST_ID,
ariaPressed: undefined,
title: SIGN_IN_TOOLTIP,
ariaDescribedBy: 'follow-button-signin-tooltip-description',
    }
  }

if (isPending) {
return {
disabled: true,
ariaBusy: true,
text: isFollowing ? 'Following' : 'Follow',
variant: isFollowing ? 'secondary' : 'default',
testId: isFollowing ? FOLLOWING_TEST_ID : NOT_FOLLOWING_TEST_ID,
ariaPressed: isFollowing,
title: undefined,
ariaDescribedBy: undefined,
    }
  }

if (isFollowing) {
return {
disabled: false,
ariaBusy: false,
text: 'Following',
variant: 'secondary',
testId: FOLLOWING_TEST_ID,
ariaPressed: true,
title: undefined,
ariaDescribedBy: undefined,
    }
  }

return {
disabled: false,
ariaBusy: false,
text: 'Follow',
variant: 'default',
testId: NOT_FOLLOWING_TEST_ID,
ariaPressed: false,
title: undefined,
ariaDescribedBy: undefined,
  }
}

export function FollowButton({
isFollowing,
isAuthenticated,
isPending,
errorKind,
onToggle,
label,
className,
}: FollowButtonProps) {
const visual = resolveVisualState(isFollowing, isAuthenticated, isPending)

const handleClick = () => {
if (!isAuthenticated || isPending) return
onToggle()
  }

const tooltipDescriptionId = 'follow-button-signin-tooltip-description'

return (
<div
className={cn('flex flex-col items-start gap-1', className)}
data-testid='follow-button-slot'
    >
{errorKind !== null && errorKind !== 'unknown' ? (
<FollowErrorNotice errorKind={errorKind} />
      ) : null}
<Button
type='button'
variant={visual.variant}
disabled={visual.disabled}
aria-busy={visual.ariaBusy ? 'true' : undefined}
aria-pressed={visual.ariaPressed}
aria-disabled={visual.disabled ? 'true' : undefined}
aria-describedby={
visual.ariaDescribedBy ? tooltipDescriptionId : undefined
        }
title={visual.title}
data-testid={visual.testId}
data-following={isFollowing ? 'true' : 'false'}
data-authenticated={isAuthenticated ? 'true' : 'false'}
data-pending={isPending ? 'true' : 'false'}
onClick={handleClick}
className={BUTTON_BASE}
      >
{label ?? visual.text}
</Button>
{/* The hidden description node for the sign-in tooltip. */}
{visual.ariaDescribedBy ? (
<span
id={tooltipDescriptionId}
className='sr-only'
data-testid='follow-button-signin-tooltip-description'
        >
{SIGN_IN_TOOLTIP}
</span>
      ) : null}
</div>
  )
}

export type { OptimisticToggleErrorKind }

export type { FollowErrorNoticeProps } from './FollowErrorNotice'