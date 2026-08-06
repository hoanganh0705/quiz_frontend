'use client';

/**
 * `features/admin/category-admin/components/CategoryAdminPage.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.F2 (full surface); supersedes TKT-7.4.A3 stub.
 *
 * Composite page component for the `/admin/categories` route. Composes:
 *   - the page header ("Categories" + "Add Category" CTA gated on
 *     `usePermission('category_create')`)
 *   - `CategoryAdminList` (active / soft-deleted tabs with row-level
 *     dialogs)
 *   - `CategoryCreateDialog`
 *
 * The entire render is gated by `phase7_admin_category === 'live'`.
 * When the flag is `'placeholder'`, this component renders the
 * documented disabled notice.
 *
 * No service / axios / fetch calls originate from this component; all
 * data fetching and mutations are owned by `CategoryAdminList`'s
 * `useCategoryAdminList` and the individual dialog mutation hooks.
 */

import { useCallback, useEffect, useState } from 'react';

import { Plus, Shield } from 'lucide-react';
import { mutate as globalMutate } from 'swr';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAdminFeatureFlag, usePermission } from '@/features/admin/hooks';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';

import { CategoryAdminList } from './CategoryAdminList';
import { CategoryCreateDialog } from './CategoryCreateDialog';
import type { CategoryDto } from '../category-types';
import { CATEGORY_ADMIN_LIST_KEY } from '../hooks/useCategoryAdminList';
import { publicCategoriesKeyMatcher } from '../cache/category-cache-keys';
import { subscribeCategoryAdminInvalidate } from '../cache/category-cross-tab';

function CategoryAdminComingSoon() {
  return (
    <EmptyState
      icon={Shield}
      title='Category management coming soon'
      description='Category admin surfaces are not yet enabled. Set NEXT_PUBLIC_PHASE7_ADMIN_CATEGORY=live to preview the feature.'
      size='md'
    />
  );
}

const PERMISSION_CREATE = 'category_create';

export interface CategoryAdminPageProps {
  /** @deprecated No-op; kept for forward-compatibility. */
  onAddCategory?: never;
}

export function CategoryAdminPage(_props: CategoryAdminPageProps) {
  const { isLive } = useAdminFeatureFlag('phase7_admin_category');
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  const handleCreated = useCallback(
    (category: CategoryDto) => {
      push({
        title: 'Category created',
        body: `"${category.name}" has been created successfully.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    },
    [push],
  );

  // Cross-tab invalidation: when a sibling tab performs any category
  // admin mutation, revalidate the admin list and the public category
  // caches so the next render reflects the new state. The local-tab
  // mutation already invalidates these caches in its own success branch;
  // the broadcast + subscriber pair covers the cross-tab case.
  //
  // Source ticket: TKT-7.4.G2.
  useEffect(() => {
    if (!isLive) return;
    const unsubscribe = subscribeCategoryAdminInvalidate(() => {
      void globalMutate(CATEGORY_ADMIN_LIST_KEY);
      void globalMutate(publicCategoriesKeyMatcher);
    });
    return unsubscribe;
  }, [isLive]);

  if (!isLive) {
    return <CategoryAdminComingSoon />;
  }

  return (
    <div className='px-4 sm:px-6 pb-8'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Categories</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Organize and manage quiz categories for better discoverability.
          </p>
        </div>
        {hasPermission && (
          <Button
            onClick={() => setCreateOpen(true)}
            className='gap-2'
          >
            <Plus className='h-4 w-4' />
            Add Category
          </Button>
        )}
      </div>

      <CategoryAdminList onAddCategory={() => setCreateOpen(true)} />

      <CategoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}