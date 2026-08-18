'use client';

import { FolderTree } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export interface CategoryAdminEmptyStateProps {

tab: 'active' | 'deleted';

onCreate?: () => void;
}

export function CategoryAdminEmptyState({
tab,
onCreate,
}: CategoryAdminEmptyStateProps) {
if (tab === 'active') {
return (
<EmptyState
icon={FolderTree}
title='No categories yet'
description='Create your first category to start organising quizzes by topic.'
actions={
onCreate
? [
{
label: 'Add Category',
onClick: onCreate,
variant: 'default' as const,
icon: FolderTree,
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
icon={FolderTree}
title='No soft-deleted categories'
description='Categories you delete will appear here so you can restore them.'
size='md'
    />
  );
}