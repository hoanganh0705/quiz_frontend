'use client';

/**
 * `features/admin/category-admin/hooks/useUpdateCategory.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.C3.
 *
 * Mutation hook that wraps `updateCategory` with:
 *   - SWR cache invalidation for `categoryAdmin:list:*`, the public
 *     `categories:*` keys, and the per-slug `categories:slug:<slug>`
 *     key (when the slug changes).
 *   - Cross-tab invalidation broadcast on success so other tabs see
 *     the update.
 *   - Typed `ApiError` propagation for `CATEGORY_SLUG_CONFLICT` (rename
 *     conflict) and `CATEGORY_NOT_FOUND` (id no longer exists).
 *
 * Mirrors `useUpdateTag` (TKT-7.3.C3).
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';

import { updateCategory } from '@/features/admin/services/category-admin.service';
import {
  CATEGORY_ADMIN_LIST_KEY,
  categorySlugKey,
  publicCategoriesKeyMatcher,
} from '../cache/category-cache-keys';
import {
  broadcastCategoryAdminInvalidate,
} from '../cache/category-cross-tab';
import type { CategoryDto, CategoryUpdateDto } from '../category-types';

export interface UseUpdateCategory {
  update: (id: string, input: CategoryUpdateDto) => Promise<CategoryDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useUpdateCategory(): UseUpdateCategory {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const update = useCallback(
    async (id: string, input: CategoryUpdateDto): Promise<CategoryDto> => {
      abortRef.current?.();
      setIsPending(true);
      setError(null);

      const newSlug = input.slug;

      try {
        const result = await updateCategory(id, input);

        const keysToRevalidate: Array<string | ((key: unknown) => boolean)> = [
          CATEGORY_ADMIN_LIST_KEY,
          publicCategoriesKeyMatcher,
          ...(newSlug ? [categorySlugKey(newSlug)] : []),
        ];

        await Promise.all(
          keysToRevalidate.map((key) =>
            typeof key === 'string'
              ? globalMutate(key)
              : globalMutate(key as (k: unknown) => boolean),
          ),
        );

        broadcastCategoryAdminInvalidate('update', id);
        setIsPending(false);
        return result;
      } catch (thrown: unknown) {
        setIsPending(false);
        const apiError =
          thrown instanceof ApiError
            ? thrown
            : new ApiError(thrown as never);
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

  return { update, isPending, error, reset };
}