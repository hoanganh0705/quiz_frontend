'use client';

/**
 * `features/admin/category-admin/hooks/useCategoryAdminList.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.C1.
 *
 * ## Purpose
 *
 * SWR-powered read hook for the category admin list. Calls the public
 * `listCategories` endpoint (the only category-list endpoint currently
 * available; a dedicated admin endpoint is tracked as a runtime
 * verification item in `EPIC_7_4_A1.md` §6). On success, the response
 * is split into:
 *
 *   - `active`     — rows where `deletedAt === null` (or absent)
 *   - `softDeleted` — rows where `deletedAt` is a non-null ISO 8601 string
 *   - `all`       — the full union
 *
 * Components must not call the SDK directly — they use this hook.
 *
 * Mirrors `useTagAdminList` (TKT-7.3.C1) but for categories.
 */

import useSWR from 'swr';

import { ApiError } from '@/lib/api';

import { listCategories } from '@/features/categories/services/categories.service';
import type {
  CategoryAdminListItem,
  CategoryListItem,
  DeletedCategoryListItem,
} from '../category-types';

// ─── SWR key ───────────────────────────────────────────────────────────────

/** Stable SWR cache key for the admin category list. */
export const CATEGORY_ADMIN_LIST_KEY = 'category-admin:list' as const;

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseCategoryAdminList {
  /** Active (non-deleted) categories. */
  active: CategoryListItem[];
  /** Soft-deleted categories. */
  softDeleted: DeletedCategoryListItem[];
  /** All categories (active + soft-deleted). */
  all: CategoryAdminListItem[];
  /** True while the request is in-flight. */
  isLoading: boolean;
  /** True on the first load (no stale data from cache). */
  isValidating: boolean;
  /** The typed API error, or null on success / loading. */
  error: ApiError | null;
  /**
   * Revalidates the admin category list.
   * Call after create / update / delete / restore mutations.
   */
  mutate: () => void;
}

export function useCategoryAdminList(): UseCategoryAdminList {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    CATEGORY_ADMIN_LIST_KEY,
    async (): Promise<CategoryAdminListItem[]> => {
      const result = await listCategories({ limit: 100 });
      const rawItems = result.data ?? [];

      return rawItems.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = item as any;
        if (raw.deletedAt && raw.deletedAt !== null) {
          return {
            categoryId: item.categoryId as string,
            name: item.name as string,
            description: (item.description ?? null) as string | null,
            slug: item.slug as string,
            imageUrl: (item.imageUrl ?? null) as string | null,
            createdAt: item.createdAt as string,
            updatedAt: item.updatedAt as string,
            deletedAt: String(raw.deletedAt),
          } satisfies DeletedCategoryListItem;
        }
        return {
          categoryId: item.categoryId as string,
          name: item.name as string,
          description: (item.description ?? null) as string | null,
          slug: item.slug as string,
          imageUrl: (item.imageUrl ?? null) as string | null,
          createdAt: item.createdAt as string,
          updatedAt: item.updatedAt as string,
          deletedAt: null,
        } satisfies CategoryListItem;
      });
    },
  );

  const items: CategoryAdminListItem[] = data ?? [];
  const active: CategoryListItem[] = items.filter(
    (category) => category.deletedAt === null,
  ) as CategoryListItem[];
  const softDeleted: DeletedCategoryListItem[] = items.filter(
    (category) => category.deletedAt !== null,
  ) as DeletedCategoryListItem[];

  return {
    active,
    softDeleted,
    all: items,
    isLoading,
    isValidating,
    error: error != null && 'code' in error ? (error as ApiError) : null,
    mutate,
  };
}