'use client';

import { useCallback, useEffect, useState } from 'react';

import { Plus, Shield } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { usePermission } from '@/features/admin/hooks';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';
import { mutate as globalMutate } from 'swr';
import { addCategoryAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

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
description='Category admin surfaces are not yet enabled. Set NEXT_PUBLIC_ADMIN_CATEGORY_LIVE=live to preview the feature.'
size='md'
    />
  );
}

const PERMISSION_CREATE = 'category_create';

export interface CategoryAdminPageProps {

onAddCategory?: never;
}

export function CategoryAdminPage(_props: CategoryAdminPageProps) {
  const { isLive } = useAdminFeatureFlag('admin_category_live');
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    addCategoryAdminBreadcrumb({
      action: 'category.admin.mount',
      route: 'category-admin.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

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