'use client';

import { useCallback, useEffect, useState } from 'react';

import { Plus, Shield } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { usePermission } from '@/features/admin/hooks';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';
import { mutate as globalMutate } from 'swr';
import { addTagAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

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
description='Tag admin surfaces are not yet enabled. Set NEXT_PUBLIC_ADMIN_TAG_LIVE=live to preview the feature.'
size='md'
    />
  );
}

const PERMISSION_CREATE = 'tag_create';

export interface TagAdminPageProps {

onAddTag?: never;
}

export function TagAdminPage(_props: TagAdminPageProps) {
  const { isLive } = useAdminFeatureFlag('admin_tag_live');
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    addTagAdminBreadcrumb({
      action: 'tag.admin.mount',
      route: 'tag-admin.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

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
