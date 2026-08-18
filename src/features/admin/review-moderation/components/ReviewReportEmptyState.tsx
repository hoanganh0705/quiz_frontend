'use client';

import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export interface ReviewReportEmptyStateProps {

filter: 'pending' | 'resolved';

onShowResolved?: () => void;

className?: string;
}

const COPY: Readonly<
Record<
'pending' | 'resolved',
{ title: string; description: string }
  >
> = Object.freeze({
pending: {
title: 'No pending reports',
description:
'No reports are awaiting moderation right now. New reports will appear here as they are filed.',
  },
resolved: {
title: 'No resolved reports',
description:
'No reports match the resolved filter. Try the pending tab to see what is awaiting moderation.',
  },
});

export function ReviewReportEmptyState({
filter,
onShowResolved,
className,
}: ReviewReportEmptyStateProps): React.ReactElement {
const copy = COPY[filter];
const showCta = filter === 'pending' && typeof onShowResolved === 'function';

return (
<div
data-testid={`review-report-empty-state-${filter}`}
className={className}
    >
<EmptyState
icon={Inbox}
title={copy.title}
description={copy.description}
actions={
showCta
? [
{
label: 'View resolved reports',
onClick: onShowResolved as () => void,
                },
              ]
: undefined
        }
      />
</div>
  );
}
