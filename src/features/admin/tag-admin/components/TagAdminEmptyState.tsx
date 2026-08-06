'use client';

/**
 * `features/admin/tag-admin/components/TagAdminEmptyState.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 *
 * ## Purpose
 *
 * Empty state for the tag admin list. Renders appropriate copy per tab:
 *   - 'active': "No tags yet" + optional "Add Tag" CTA.
 *   - 'deleted': "No soft-deleted tags" (no CTA needed).
 *
 * Wraps the design-system `EmptyState` primitive.
 */

import { Tag } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export interface TagAdminEmptyStateProps {
  /** Which tab this empty state represents. */
  tab: 'active' | 'deleted';
  /** Optional CTA — shown on the 'active' tab when provided. */
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
