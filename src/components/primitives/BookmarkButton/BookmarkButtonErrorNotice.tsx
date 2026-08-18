'use client';

import type { BookmarkMutationErrorState } from '@/features/bookmarks/utils';

export interface BookmarkButtonErrorNoticeProps {

errorState: BookmarkMutationErrorState;

className?: string;
}

export function BookmarkButtonErrorNotice({
errorState,
className,
}: BookmarkButtonErrorNoticeProps) {
if (errorState.kind === 'ok' || errorState.kind === 'setup-prompt') {
return null;
  }
if (errorState.title === null || errorState.body === null) {
return null;
  }

return (
<p
role='status'
aria-live='polite'
data-testid={`bookmark-error-notice-${errorState.kind}`}
className={
className ??
'text-xs text-destructive'
      }
    >
<strong className='font-semibold'>{errorState.title}</strong>
{' · '}
<span>{errorState.body}</span>
</p>
  );
}