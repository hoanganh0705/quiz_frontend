'use client';

/**
 * `features/admin/category-admin/components/CategoryAdminEmptyState.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.D3.
 *
 * Empty state for the category admin list. Renders appropriate copy
 * per tab:
 *   - 'active': "No categories yet" + optional "Add Category" CTA.
 *   - 'deleted': "No soft-deleted categories" (no CTA needed).
 *
 * Wraps the design-system `EmptyState` primitive.
 */

import { FolderTree } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export interface CategoryAdminEmptyStateProps {
  /** Which tab this empty state represents. */
  tab: 'active' | 'deleted';
  /** Optional CTA — shown on the 'active' tab when provided. */
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