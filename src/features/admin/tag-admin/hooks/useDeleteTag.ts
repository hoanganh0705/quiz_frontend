'use client';

/**
 * `features/admin/tag-admin/hooks/useDeleteTag.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C4.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';
import { addTagAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { deleteTag } from '@/features/admin/services/tag-admin.service';
import { TAG_ADMIN_LIST_KEY } from './useTagAdminList';
import {
  broadcastTagAdminInvalidate,
} from '../cache/tag-cross-tab';

const PUBLIC_TAGS_KEY = 'tags:directory' as const;

export interface UseDeleteTag {
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
  audit: AuditSnapshot;
}

export interface AuditSnapshot {
  beforeTagId: string | null;
  afterTagId: string | null;
}

export function useDeleteTag(): UseDeleteTag {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Snapshot the audit data in state so the return object is render-stable.
  const [beforeTagId, setBeforeTagId] = useState<string | null>(null);
  const [afterTagId, setAfterTagId] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    abortRef.current?.();
    setIsPending(true);
    setError(null);

    setBeforeTagId(id);
    setAfterTagId(null);

    const start = Date.now();

    addTagAdminBreadcrumb({
      action: 'tag.delete',
      route: 'tag-admin.deleteTag',
      status: 'started',
      durationMs: 0,
    });

    try {
      await deleteTag(id);

      setAfterTagId(id);
      addTagAdminBreadcrumb({
        action: 'tag.delete',
        route: 'tag-admin.deleteTag',
        status: 'success',
        durationMs: Date.now() - start,
        targetId: id,
      });

      await Promise.all([
        globalMutate(TAG_ADMIN_LIST_KEY),
        globalMutate(PUBLIC_TAGS_KEY),
      ]);

      broadcastTagAdminInvalidate('delete', id);
      setIsPending(false);
    } catch (thrown: unknown) {
      const apiError =
        thrown instanceof ApiError
          ? thrown
          : new ApiError(thrown as never);

      addTagAdminBreadcrumb({
        action: 'tag.delete',
        route: 'tag-admin.deleteTag',
        status: 'failure',
        durationMs: Date.now() - start,
        targetId: id,
        code: apiError.code,
        requestId: apiError.requestId,
      });

      setIsPending(false);
      setError(apiError);
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.();
    setError(null);
    setIsPending(false);
    setBeforeTagId(null);
    setAfterTagId(null);
  }, []);

  return {
    remove,
    isPending,
    error,
    reset,
    audit: { beforeTagId, afterTagId },
  };
}
