'use client';

import useSWR from 'swr';

import { ApiError } from '@/lib/api';

import { listCategories } from '@/features/categories/services/categories.service';
import type {
CategoryAdminListItem,
CategoryListItem,
DeletedCategoryListItem,
} from '../category-types';

export const CATEGORY_ADMIN_LIST_KEY = 'category-admin:list' as const;

export interface UseCategoryAdminList {

active: CategoryListItem[];

softDeleted: DeletedCategoryListItem[];

all: CategoryAdminListItem[];

isLoading: boolean;

isValidating: boolean;

error: ApiError | null;

mutate: () => void;
}

export function useCategoryAdminList(): UseCategoryAdminList {
const { data, error, isLoading, isValidating, mutate } = useSWR(
CATEGORY_ADMIN_LIST_KEY,
async (): Promise<CategoryAdminListItem[]> => {
const result = await listCategories({ limit: 100 });
const rawItems = result.data ?? [];

return rawItems.map((item) => {

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