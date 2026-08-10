'use client';

/**
 * `features/admin/category-admin/hooks/useRestoreCategory.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.C5.
 *
 * Restore hook that wraps `restoreCategory` (a soft-deleted category
 * is brought back to the active list) with:
 *   - SWR cache invalidation for `categoryAdmin:list:*` and the
 *     public `categories:*` keys.
 *   - Cross-tab invalidation broadcast on success.
 *   - `admin:7.1` audit breadcrumb on success and failure.
 *   - Typed `ApiError` propagation for:
 *       - `CATEGORY_SLUG_CONFLICT`   (slug was claimed while soft-deleted;
 *                                      `CategoryRestoreDialog` re-submits
 *                                      with `renamedSlug`).
 *       - `CATEGORY_ALREADY_ACTIVE`   (defensive: row was already
 *                                      restored; no retry).
 *       - `CATEGORY_RESTORE_INVARIANT` (defensive: backend rejected
 *                                      the restore; no retry).
 *
 * Mirrors `useRestoreTag` (TKT-7.3.C5).
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';
import { addCategoryAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { restoreCategory } from '@/features/admin/services/category-admin.service';
import {
  CATEGORY_ADMIN_LIST_KEY,
  categorySlugKey,
  publicCategoriesKeyMatcher,
} from '../cache/category-cache-keys';
import {
  broadcastCategoryAdminInvalidate,
} from '../cache/category-cross-tab';
import type { CategoryDto } from '../category-types';

export interface RestoreCategoryOptions {
  /** Slug override for resolving CATEGORY_SLUG_CONFLICT. */
  renamedSlug?: string;
}

export interface UseRestoreCategory {
  restore: (
    id: string,
    options?: RestoreCategoryOptions,
  ) => Promise<CategoryDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

/**
 * Best-effort slug override passed through the `restoreCategory`
 * service. The current SDK contract (`restoreCategory(id)`) does not
 * accept a slug override directly; this module preserves the call-site
 * signature so the future backend extension does not require a
 * consumer-facing rename.
 */
function deriveRestoreServiceArgs(
  options?: RestoreCategoryOptions,
): { renamedSlug?: string } {
  if (!options) return {};
  return { renamedSlug: options.renamedSlug };
}

export function useRestoreCategory(): UseRestoreCategory {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const restore = useCallback(
    async (
      id: string,
      options?: RestoreCategoryOptions,
    ): Promise<CategoryDto> => {
      abortRef.current?.();
      setIsPending(true);
      setError(null);

      const start = Date.now();
      const { renamedSlug } = deriveRestoreServiceArgs(options);

      addCategoryAdminBreadcrumb({
        action: 'category.restore',
        route: 'category-admin.restoreCategory',
        status: 'started',
        durationMs: 0,
      });

      try {
        const result = await restoreCategory(id);

        addCategoryAdminBreadcrumb({
          action: 'category.restore',
          route: 'category-admin.restoreCategory',
          status: 'success',
          durationMs: Date.now() - start,
          targetId: id,
        });

        const keysToRevalidate: Array<string | ((key: unknown) => boolean)> = [
          CATEGORY_ADMIN_LIST_KEY,
          publicCategoriesKeyMatcher,
          ...(renamedSlug ? [categorySlugKey(renamedSlug)] : []),
        ];
        await Promise.all(
          keysToRevalidate.map((key) =>
            typeof key === 'string'
              ? globalMutate(key)
              : globalMutate(key as (k: unknown) => boolean),
          ),
        );

        broadcastCategoryAdminInvalidate('restore', id);
        setIsPending(false);
        return result;
      } catch (thrown: unknown) {
        const apiError =
          thrown instanceof ApiError
            ? thrown
            : new ApiError(thrown as never);

        addCategoryAdminBreadcrumb({
          action: 'category.restore',
          route: 'category-admin.restoreCategory',
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