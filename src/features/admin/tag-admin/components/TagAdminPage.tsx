'use client';

/**
 * `features/admin/tag-admin/components/TagAdminPage.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.F2.
 *
 * ## Purpose
 *
 * Composite page component for the `/admin/tags` route. Composes:
 *   - the page header ("Tags" + "Add Tag" CTA gated on `usePermission('tag_create')`)
 *   - `TagAdminList` (active / soft-deleted tabs with row-level dialogs)
 *   - `TagCreateDialog`
 *
 * The entire render is gated by `phase7_admin_tag === 'live'`. When the
 * flag is `'placeholder'`, this component renders the documented disabled
 * notice.
 */

import { useCallback, useEffect, useState } from 'react';

import { Plus, Shield } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { usePermission } from '@/features/admin/hooks';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';
import { mutate as globalMutate } from 'swr';

import { TagAdminList } from './TagAdminList';
import { TagCreateDialog } from './TagCreateDialog';
import type { TagDto } from '../tag-types';
import { TAG_ADMIN_LIST_KEY } from '../hooks/useTagAdminList';
import { invalidatePublicTagCaches } from '../cache/tag-cache-keys';
import { subscribeTagAdminInvalidate } from '../cache/tag-cross-tab';

function TagAdminComingSoon() {
  return (
    <EmptyState
      icon={Shield}
      title='Tag management coming soon'
      description='Tag admin surfaces are not yet enabled. Set NEXT_PUBLIC_PHASE7_ADMIN_TAG=live to preview the feature.'
      size='md'
    />
  );
}

const PERMISSION_CREATE = 'tag_create';

/**
 * Tag admin page. Gated by `phase7_admin_tag`.
 *
 * ## Interface contract
 *
 * Exports:
 *   - `TagAdminPage` — no props required
 *   - `TagAdminPageProps` — the props interface (currently unused; exported for future extensibility)
 */
export interface TagAdminPageProps {
  /** @deprecated No-op; kept for forward-compatibility. */
  onAddTag?: never;
}

export function TagAdminPage(_props: TagAdminPageProps) {
  const { isLive } = useAdminFeatureFlag('phase7_admin_tag');
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  const handleCreated = useCallback(
    (tag: TagDto) => {
      push({
        title: 'Tag created',
        body: `"${tag.name}" has been created successfully.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    },
    [push],
  );

  // Cross-tab invalidation: when a sibling tab performs any tag admin
  // mutation, revalidate the admin list and the public tag caches so
  // the next render reflects the new state. The local-tab mutation
  // already invalidates these caches in its own success branch; the
  // broadcast + subscriber pair covers the cross-tab case.
  //
  // Source ticket: TKT-7.3.G2.
  useEffect(() => {
    if (!isLive) return;
    const unsubscribe = subscribeTagAdminInvalidate(() => {
      void globalMutate(TAG_ADMIN_LIST_KEY);
      void invalidatePublicTagCaches();
    });
    return unsubscribe;
  }, [isLive]);

  if (!isLive) {
    return <TagAdminComingSoon />;
  }

  return (
    <div className='px-4 sm:px-6 pb-8'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Tags</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Organize and manage quiz tags for better discoverability.
          </p>
        </div>
        {hasPermission && (
          <Button
            onClick={() => setCreateOpen(true)}
            className='gap-2'
          >
            <Plus className='h-4 w-4' />
            Add Tag
          </Button>
        )}
      </div>

      <TagAdminList />

      <TagCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
