'use client';

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { followedCategories } from '@/features/categories/services/categories.service';
import { followedTags } from '@/features/tags/services/tags.service';

export const FOLLOWED_LOOKUP_LIMIT = 100;

export const followedCategoriesKey = () =>
['follow-lookup', 'categories', { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export const followedTagsKey = () =>
['follow-lookup', 'tags', { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export interface UseFollowedLookupResult {

categories: ReadonlySet<string>;

tags: ReadonlySet<string>;

isLoading: boolean;

error: ApiError | null;

mutate: () => Promise<void>;
}

function extractCategoryIds(
page: Awaited<ReturnType<typeof followedCategories>> | undefined,
): ReadonlySet<string> {
const ids = new Set<string>();
for (const item of page?.data ?? []) {
if (item.categoryId) {
ids.add(item.categoryId);
    }
  }
return ids;
}

function extractTagIds(
page: Awaited<ReturnType<typeof followedTags>> | undefined,
): ReadonlySet<string> {
const ids = new Set<string>();
for (const item of page?.data ?? []) {
if (item.tagId) {
ids.add(item.tagId);
    }
  }
return ids;
}

const NOOP = async (): Promise<void> => {
return;
};

export function useFollowedLookup(): UseFollowedLookupResult {
const { isAuthenticated } = useAuthState();

const categoriesKey = isAuthenticated ? followedCategoriesKey() : null;
const tagsKey = isAuthenticated ? followedTagsKey() : null;

const categoriesFetcher = () =>
followedCategories({ limit: FOLLOWED_LOOKUP_LIMIT });

const tagsFetcher = () => followedTags({ limit: FOLLOWED_LOOKUP_LIMIT });

const categoriesSwr = useSWR(categoriesKey, categoriesFetcher, {
revalidateOnFocus: true,
  });
const tagsSwr = useSWR(tagsKey, tagsFetcher, {
revalidateOnFocus: true,
  });

const categories = extractCategoryIds(categoriesSwr.data);
const tags = extractTagIds(tagsSwr.data);

const isLoading = categoriesSwr.isLoading || tagsSwr.isLoading;

const error: ApiError | null = (() => {
const first = categoriesSwr.error ?? tagsSwr.error;
if (!first) return null;
if (isApiError(first)) return first;

if (first && typeof first === 'object' && 'status' in first) {
return first as unknown as ApiError;
    }

return {
status: 0,
message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

const mutate = async (): Promise<void> => {
if (!isAuthenticated) {
return NOOP();
    }
await Promise.all([
categoriesSwr.mutate(),
tagsSwr.mutate(),
    ]);
  };

return {
categories,
tags,
isLoading,
error,
mutate,
  };
}