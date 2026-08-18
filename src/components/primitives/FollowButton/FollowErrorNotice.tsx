'use client';

import type { OptimisticToggleErrorKind } from '@/lib/api';

export interface FollowErrorNoticeProps {

errorKind: OptimisticToggleErrorKind | null;

className?: string;

testId?: string;
}

const COPY: Record<
Exclude<OptimisticToggleErrorKind, 'unknown'>,
string
> = {
http_429: 'Slow down — try again in a minute',
http_4xx: "Couldn't update — try again",
http_5xx: "Couldn't update — retry",
http_404: 'This tag / category is no longer available',
};

export function FollowErrorNotice({
errorKind,
className,
testId,
}: FollowErrorNoticeProps) {
if (errorKind === null || errorKind === 'unknown') {
return null;
  }

return (
<p
role='status'
aria-live='polite'
data-testid={testId ?? `follow-error-notice-${errorKind}`}
className={className ?? 'text-xs text-destructive'}
    >
{COPY[errorKind]}
</p>
  );
}