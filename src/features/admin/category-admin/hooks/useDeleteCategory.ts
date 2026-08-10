'use client';

/**
 * `features/admin/category-admin/hooks/useDeleteCategory.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.C4.
 *
 * Destructive mutation hook that wraps `deleteCategory` (soft delete)
 * with:
 *   - SWR cache invalidation for `categoryAdmin:list:*` and the
 *     public `categories:*` keys.
 *   - Cross-tab invalidation broadcast on success so other tabs see
 *     the category move to the soft-deleted tab.
 *   - `admin:7.1` audit breadcrumb on success and failure so the
 *     destructive action is captured for Sentry / audit replay.
 *   - Typed `ApiError` propagation for `CATEGORY_NOT_FOUND`.
 *
 * Mirrors `useDeleteTag` (TKT-7.3.C4). The category delete uses a
 * non-typed confirm because the backend declares the operation
 * reversible (per Story 7.4 AC #5).
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';
import { addCategoryAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { deleteCategory } from '@/features/admin/services/category-admin.service';
import {
  CATEGORY_ADMIN_LIST_KEY,
  publicCategoriesKeyMatcher,
} from '../cache/category-cache-keys';
import {
  broadcastCategoryAdminInvalidate,
} from '../cache/category-cross-tab';

export interface UseDeleteCategory {
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
  audit: CategoryAuditSnapshot;
}

export interface CategoryAuditSnapshot {
  beforeCategoryId: string | null;
  afterCategoryId: string | null;
}

export function useDeleteCategory(): UseDeleteCategory {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Snapshot the audit data in state so the return object is render-stable.
  const [beforeCategoryId, setBeforeCategoryId] = useState<string | null>(null);
  const [afterCategoryId, setAfterCategoryId] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    abortRef.current?.();
    setIsPending(true);
    setError(null);

    setBeforeCategoryId(id);
    setAfterCategoryId(null);

    const start = Date.now();

    addCategoryAdminBreadcrumb({
      action: 'category.delete',
      route: 'category-admin.deleteCategory',
      status: 'started',
      durationMs: 0,
    });

    try {
      await deleteCategory(id);

      setAfterCategoryId(id);
      addCategoryAdminBreadcrumb({
        action: 'category.delete',
        route: 'category-admin.deleteCategory',
        status: 'success',
        durationMs: Date.now() - start,
        targetId: id,
      });

      await Promise.all([
        globalMutate(CATEGORY_ADMIN_LIST_KEY),
        globalMutate(publicCategoriesKeyMatcher),
      ]);

      broadcastCategoryAdminInvalidate('delete', id);
      setIsPending(false);
    } catch (thrown: unknown) {
      const apiError =
        thrown instanceof ApiError
          ? thrown
          : new ApiError(thrown as never);

      addCategoryAdminBreadcrumb({
        action: 'category.delete',
        route: 'category-admin.deleteCategory',
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
    setBeforeCategoryId(null);
    setAfterCategoryId(null);
  }, []);

  return {
    remove,
    isPending,
    error,
    reset,
    audit: { beforeCategoryId, afterCategoryId },
  };
}