'use client';

/**
 * `features/admin/tag-admin/components/TagAdminList.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.F1.
 *
 * ## Purpose
 *
 * Renders the active / soft-deleted tab interface backed by `useTagAdminList`.
 * Each tab shows the appropriate rows with action buttons that open the
 * corresponding dialogs. Tab state is stored in the URL search param.
 */

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
import { Skeleton } from '@/components/ui/Skeleton';
import { usePermission } from '@/features/admin/hooks';

import type { DeletedTagListItem, TagListItem } from '../tag-types';
import { useTagAdminList } from '../hooks/useTagAdminList';
import { TagAdminEmptyState } from './TagAdminEmptyState';
import { TagAdminErrorState } from './TagAdminErrorState';
import { TagAdminSkeleton } from './TagAdminSkeleton';
import { TagEditDialog } from './TagEditDialog';
import { TagDeleteConfirmDialog } from './TagDeleteConfirmDialog';
import { TagRestoreDialog } from './TagRestoreDialog';
import type { TagDto } from '../tag-types';

export interface TagAdminListProps {
  /** Called when user clicks the "Add Tag" CTA in empty active state. */
  onAddTag?: () => void;
}

type ActiveTagListItem = TagListItem;
type SoftDeletedTagListItem = DeletedTagListItem;

const TAB_ACTIVE = 'active';
const TAB_DELETED = 'deleted';
const DEFAULT_TAB = TAB_ACTIVE;

/** Formats an ISO date string to a human-readable date. */
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

/** Formats an ISO date string to a human-readable date + time. */
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

/** Single tag card for the active tab. */
function ActiveTagCard({
  tag,
  onEdit,
  onDelete,
}: {
  tag: ActiveTagListItem;
  onEdit: (tag: TagListItem) => void;
  onDelete: (tag: TagListItem) => void;
}) {
  const canUpdate = usePermission('tag_update').hasPermission;
  const canDelete = usePermission('tag_delete').hasPermission;

  return (
    <div className='rounded-lg border border-border p-4 space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-medium text-foreground truncate' title={tag.name}>
          {tag.name}
        </span>
        <span className='text-xs text-muted-foreground font-mono shrink-0'>
          {tag.slug}
        </span>
      </div>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-muted-foreground'>
          {formatDate(tag.createdAt)}
        </span>
        <div className='flex items-center gap-1'>
          {canUpdate && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-muted-foreground hover:text-foreground'
              onClick={() => onEdit(tag)}
              aria-label={`Edit ${tag.name}`}
            >
              <PencilIcon className='h-4 w-4' />
            </Button>
          )}
          {canDelete && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-muted-foreground hover:text-destructive'
              onClick={() => onDelete(tag)}
              aria-label={`Delete ${tag.name}`}
            >
              <Trash2Icon className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Single tag card for the soft-deleted tab. */
function SoftDeletedTagCard({
  tag,
  onRestore,
}: {
  tag: SoftDeletedTagListItem;
  onRestore: (tag: DeletedTagListItem) => void;
}) {
  const canRestore = usePermission('tag_restore').hasPermission;

  return (
    <div className='rounded-lg border border-border p-4 space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-medium text-foreground truncate' title={tag.name}>
          {tag.name}
        </span>
        <span className='text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono shrink-0'>
          {tag.slug}
        </span>
      </div>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-xs text-muted-foreground space-y-0.5'>
          <div>Deleted {formatDateTime(tag.deletedAt)}</div>
          <div>Created {formatDate(tag.createdAt)}</div>
        </div>
        {canRestore && (
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={() => onRestore(tag)}
            aria-label={`Restore ${tag.name}`}
          >
            <RotateCcwIcon className='h-3.5 w-3.5' />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

export function TagAdminList({ onAddTag }: TagAdminListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = (searchParams.get('tab') as (typeof TAB_ACTIVE | typeof TAB_DELETED)) ?? DEFAULT_TAB;
  const isDeletedTab = currentTab === TAB_DELETED;

  const { active, softDeleted, isLoading, isValidating, error, mutate } =
    useTagAdminList();

  // Dialog state
  const [editTarget, setEditTarget] = useState<TagListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DeletedTagListItem | null>(null);

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
    (_tag: TagDto) => {
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
    (_tag: TagDto) => {
      setRestoreTarget(null);
      mutate();
    },
    [mutate],
  );

  const isInitialLoading = isLoading && !isValidating && active.length === 0 && softDeleted.length === 0;

  const renderActiveTabContent = useMemo(() => {
    if (isInitialLoading) return <TagAdminSkeleton tab='active' />;
    if (error) return <TagAdminErrorState error={error} onRetry={mutate} />;
    if (active.length === 0) {
      return <TagAdminEmptyState tab='active' onCreate={onAddTag} />;
    }
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
        {active.map((tag) => (
          <ActiveTagCard
            key={tag.tagId}
            tag={tag}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>
    );
  }, [isInitialLoading, error, active, mutate, onAddTag]);

  const renderDeletedTabContent = useMemo(() => {
    if (isInitialLoading) return <TagAdminSkeleton tab='deleted' />;
    if (error) return <TagAdminErrorState error={error} onRetry={mutate} />;
    if (softDeleted.length === 0) {
      return <TagAdminEmptyState tab='deleted' />;
    }
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
        {softDeleted.map((tag) => (
          <SoftDeletedTagCard
            key={tag.tagId}
            tag={tag}
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
              <span className='ml-1.5 text-xs opacity-70'>{softDeleted.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_ACTIVE}>{renderActiveTabContent}</TabsContent>
        <TabsContent value={TAB_DELETED}>
          {renderDeletedTabContent}
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <TagEditDialog
        open={editTarget !== null}
        onOpenChange={handleEditOpenChange}
        tag={editTarget}
        onUpdated={handleEditUpdated}
      />

      {/* Delete dialog */}
      <TagDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        tag={deleteTarget}
        onDeleted={handleDeleteDeleted}
      />

      {/* Restore dialog */}
      <TagRestoreDialog
        open={restoreTarget !== null}
        onOpenChange={handleRestoreOpenChange}
        tag={restoreTarget}
        onRestored={handleRestoreRestored}
      />
    </>
  );
}
