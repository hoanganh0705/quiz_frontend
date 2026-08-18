'use client';

import { Tag } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export interface TagAdminEmptyStateProps {

tab: 'active' | 'deleted';

onCreate?: () => void;
}

export function TagAdminEmptyState({ tab, onCreate }: TagAdminEmptyStateProps) {
if (tab === 'active') {
return (
<EmptyState
icon={Tag}
title='No tags yet'
description='Create your first tag to start organising quizzes by topic.'
actions={
onCreate
? [
{
label: 'Add Tag',
onClick: onCreate,
variant: 'default' as const,
icon: Tag,
                },
              ]
: undefined
        }
size='md'
      />
    );
  }

return (
<EmptyState
icon={Tag}
title='No soft-deleted tags'
description='Tags you delete will appear here so you can restore them.'
size='md'
    />
  );
}
