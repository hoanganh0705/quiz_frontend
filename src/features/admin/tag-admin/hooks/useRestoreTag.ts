'use client';

/**
 * `features/admin/tag-admin/hooks/useRestoreTag.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C5.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';
import { addTagAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { restoreTag } from '@/features/admin/services/tag-admin.service';
import type { TagDto } from '../tag-types';
import { TAG_ADMIN_LIST_KEY } from './useTagAdminList';
import {
  broadcastTagAdminInvalidate,
} from '../cache/tag-cross-tab';

const PUBLIC_TAGS_KEY = 'tags:directory' as const;

export interface RestoreOptions {
  /** Slug override for resolving TAG_SLUG_CONFLICT. */
  renamedSlug?: string;
}

export interface UseRestoreTag {
  restore: (id: string, options?: RestoreOptions) => Promise<TagDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useRestoreTag(): UseRestoreTag {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const restore = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (id: string, _options?: RestoreOptions): Promise<TagDto> => {
      abortRef.current?.();
      setIsPending(true);
      setError(null);

      const start = Date.now();

      addTagAdminBreadcrumb({
        action: 'tag.restore',
        route: 'tag-admin.restoreTag',
        status: 'started',
        durationMs: 0,
      });

      try {
        const result = await restoreTag(id);

        addTagAdminBreadcrumb({
          action: 'tag.restore',
          route: 'tag-admin.restoreTag',
          status: 'success',
          durationMs: Date.now() - start,
          targetId: id,
        });

        await Promise.all([
          globalMutate(TAG_ADMIN_LIST_KEY),
          globalMutate(PUBLIC_TAGS_KEY),
        ]);

        broadcastTagAdminInvalidate('restore', id);
        setIsPending(false);
        return result;
      } catch (thrown: unknown) {
        const apiError =
          thrown instanceof ApiError
            ? thrown
            : new ApiError(thrown as never);

        addTagAdminBreadcrumb({
          action: 'tag.restore',
          route: 'tag-admin.restoreTag',
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
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.();
    setError(null);
    setIsPending(false);
  }, []);

  return { restore, isPending, error, reset };
}
