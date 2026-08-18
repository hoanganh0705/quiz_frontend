'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { PencilIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
Tabs,
TabsContent,
TabsList,
TabsTrigger,
} from '@/components/ui/Tabs';
import { usePermission } from '@/features/admin/hooks';

import type {
CategoryListItem,
DeletedCategoryListItem,
} from '../category-types';
import { useCategoryAdminList } from '../hooks/useCategoryAdminList';
import { CategoryAdminEmptyState } from './CategoryAdminEmptyState';
import { CategoryAdminErrorState } from './CategoryAdminErrorState';
import { CategoryAdminSkeleton } from './CategoryAdminSkeleton';
import { CategoryEditDialog } from './CategoryEditDialog';
import { CategoryDeleteConfirmDialog } from './CategoryDeleteConfirmDialog';
import { CategoryRestoreDialog } from './CategoryRestoreDialog';
import type { CategoryDto } from '../category-types';

export interface CategoryAdminListProps {

onAddCategory?: () => void;
}

type ActiveCategoryListItem = CategoryListItem;
type SoftDeletedCategoryListItem = DeletedCategoryListItem;

const TAB_ACTIVE = 'active';
const TAB_DELETED = 'deleted';
const DEFAULT_TAB = TAB_ACTIVE;

function formatDate(iso: string): string {
try {
return new Intl.DateTimeFormat('en-GB', {
day: '2-digit',
month: 'short',
year: 'numeric',
    }).format(new Date(iso));
  } catch {
return iso;
  }
}

function formatDateTime(iso: string): string {
try {
return new Intl.DateTimeFormat('en-GB', {
day: '2-digit',
month: 'short',
year: 'numeric',
hour: '2-digit',
minute: '2-digit',
    }).format(new Date(iso));
  } catch {
return iso;
  }
}

function truncate(text: string | null | undefined, max = 80): string {
if (!text) return '';
if (text.length <= max) return text;
return `${text.slice(0, max - 1).trimEnd()}…`;
}

function ActiveCategoryCard({
category,
onEdit,
onDelete,
}: {
category: ActiveCategoryListItem;
onEdit: (category: CategoryListItem) => void;
onDelete: (category: CategoryListItem) => void;
}) {
const canUpdate = usePermission('category_update').hasPermission;
const canDelete = usePermission('category_delete').hasPermission;

return (
<div className='rounded-lg border border-border p-4 space-y-3'>
<div className='flex items-center justify-between gap-2'>
<span
className='font-medium text-foreground truncate'
title={category.name}
        >
{category.name}
</span>
<span className='text-xs text-muted-foreground font-mono shrink-0'>
{category.slug}
</span>
</div>
{category.description && (
<p className='text-xs text-muted-foreground line-clamp-2'>
{truncate(category.description, 100)}
</p>
      )}
<div className='flex items-center justify-between gap-2'>
<span className='text-xs text-muted-foreground'>
{formatDate(category.createdAt)}
</span>
<div className='flex items-center gap-1'>
{canUpdate && (
<Button
variant='ghost'
size='sm'
className='h-7 px-2 text-muted-foreground hover:text-foreground'
onClick={() => onEdit(category)}
aria-label={`Edit ${category.name}`}
            >
<PencilIcon className='h-4 w-4' />
</Button>
          )}
{canDelete && (
<Button
variant='ghost'
size='sm'
className='h-7 px-2 text-muted-foreground hover:text-destructive'
onClick={() => onDelete(category)}
aria-label={`Delete ${category.name}`}
            >
<Trash2Icon className='h-4 w-4' />
</Button>
          )}
</div>
</div>
</div>
  );
}

function SoftDeletedCategoryCard({
category,
onRestore,
}: {
category: SoftDeletedCategoryListItem;
onRestore: (category: DeletedCategoryListItem) => void;
}) {
const canRestore = usePermission('category_restore').hasPermission;

return (
<div className='rounded-lg border border-border p-4 space-y-3'>
<div className='flex items-center justify-between gap-2'>
<span
className='font-medium text-foreground truncate'
title={category.name}
        >
{category.name}
</span>
<span className='text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono shrink-0'>
{category.slug}
</span>
</div>
{category.description && (
<p className='text-xs text-muted-foreground line-clamp-2'>
{truncate(category.description, 100)}
</p>
      )}
<div className='flex items-center justify-between gap-2'>
<div className='text-xs text-muted-foreground space-y-0.5'>
<div>Deleted {formatDateTime(category.deletedAt)}</div>
<div>Created {formatDate(category.createdAt)}</div>
</div>
{canRestore && (
<Button
variant='outline'
size='sm'
className='h-7 gap-1.5 text-xs'
onClick={() => onRestore(category)}
aria-label={`Restore ${category.name}`}
          >
<RotateCcwIcon className='h-3.5 w-3.5' />
Restore
          </Button>
        )}
</div>
</div>
  );
}

export function CategoryAdminList({ onAddCategory }: CategoryAdminListProps) {
const router = useRouter();
const searchParams = useSearchParams();

const currentTab =
(searchParams.get('tab') as 'active' | 'deleted') ?? DEFAULT_TAB;
const isDeletedTab = currentTab === TAB_DELETED;

const { active, softDeleted, isLoading, isValidating, error, mutate } =
useCategoryAdminList();

const [editTarget, setEditTarget] = useState<CategoryListItem | null>(null);
const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(
null,
  );
const [restoreTarget, setRestoreTarget] =
useState<DeletedCategoryListItem | null>(null);

const handleTabChange = useCallback(
(value: string) => {
const params = new URLSearchParams(searchParams.toString());
params.set('tab', value);
router.push(`?${params.toString()}`, { scroll: false });
    },
[router, searchParams],
  );

const handleEditOpenChange = useCallback((open: boolean) => {
if (!open) setEditTarget(null);
  }, []);

const handleDeleteOpenChange = useCallback((open: boolean) => {
if (!open) setDeleteTarget(null);
  }, []);

const handleRestoreOpenChange = useCallback((open: boolean) => {
if (!open) setRestoreTarget(null);
  }, []);

const handleEditUpdated = useCallback(
(_category: CategoryDto) => {
setEditTarget(null);
mutate();
    },
[mutate],
  );

const handleDeleteDeleted = useCallback(
(_id: string) => {
setDeleteTarget(null);
mutate();
    },
[mutate],
  );

const handleRestoreRestored = useCallback(
(_category: CategoryDto) => {
setRestoreTarget(null);
mutate();
    },
[mutate],
  );

const isInitialLoading =
isLoading &&
!isValidating &&
active.length === 0 &&
softDeleted.length === 0;

const renderActiveTabContent = useMemo(() => {
if (isInitialLoading)
return <CategoryAdminSkeleton tab='active' />;
if (error)
return <CategoryAdminErrorState error={error} onRetry={mutate} />;
if (active.length === 0) {
return (
<CategoryAdminEmptyState tab='active' onCreate={onAddCategory} />
      );
    }
return (
<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
{active.map((category) => (
<ActiveCategoryCard
key={category.categoryId}
category={category}
onEdit={setEditTarget}
onDelete={setDeleteTarget}
          />
        ))}
</div>
    );
  }, [isInitialLoading, error, active, mutate, onAddCategory]);

const renderDeletedTabContent = useMemo(() => {
if (isInitialLoading)
return <CategoryAdminSkeleton tab='deleted' />;
if (error)
return <CategoryAdminErrorState error={error} onRetry={mutate} />;
if (softDeleted.length === 0) {
return <CategoryAdminEmptyState tab='deleted' />;
    }
return (
<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
{softDeleted.map((category) => (
<SoftDeletedCategoryCard
key={category.categoryId}
category={category}
onRestore={setRestoreTarget}
          />
        ))}
</div>
    );
  }, [isInitialLoading, error, softDeleted, mutate]);

return (
<>
<Tabs value={currentTab} onValueChange={handleTabChange}>
<TabsList className='mb-4'>
<TabsTrigger value={TAB_ACTIVE}>
Active
            {!isDeletedTab && active.length > 0 && (
<span className='ml-1.5 text-xs opacity-70'>{active.length}</span>
            )}
</TabsTrigger>
<TabsTrigger value={TAB_DELETED}>
Soft-deleted
            {isDeletedTab && softDeleted.length > 0 && (
<span className='ml-1.5 text-xs opacity-70'>
{softDeleted.length}
</span>
            )}
</TabsTrigger>
</TabsList>

<TabsContent value={TAB_ACTIVE}>{renderActiveTabContent}</TabsContent>
<TabsContent value={TAB_DELETED}>
{renderDeletedTabContent}
</TabsContent>
</Tabs>

{/* Edit dialog */}
<CategoryEditDialog
open={editTarget !== null}
onOpenChange={handleEditOpenChange}
category={editTarget}
onUpdated={handleEditUpdated}
      />

{/* Delete dialog */}
<CategoryDeleteConfirmDialog
open={deleteTarget !== null}
onOpenChange={handleDeleteOpenChange}
category={deleteTarget}
onDeleted={handleDeleteDeleted}
      />

{/* Restore dialog */}
<CategoryRestoreDialog
open={restoreTarget !== null}
onOpenChange={handleRestoreOpenChange}
category={restoreTarget}
onRestored={handleRestoreRestored}
      />
</>
  );
}
