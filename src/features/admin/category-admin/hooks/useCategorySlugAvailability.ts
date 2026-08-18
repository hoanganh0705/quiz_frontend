'use client';

import { useMemo } from 'react';

import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

import { isValidCategorySlug } from '../category-slug-regex';
import { isCategorySlugTaken } from '../category-validation';
import type { CategoryAdminListItem } from '../category-types';
import { useCategoryAdminList } from './useCategoryAdminList';

export const DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS = 250;

export type SlugAvailabilityStatus =
| 'unknown'
  | 'invalid'
  | 'taken'
  | 'available';

export interface UseCategorySlugAvailability {

status: SlugAvailabilityStatus;

debouncedSlug: string;

conflictingCategory: Pick<
CategoryAdminListItem,
'categoryId' | 'name' | 'slug'
  > | null;
}

function findConflictingCategory(
slug: string,
list: readonly CategoryAdminListItem[],
): Pick<CategoryAdminListItem, 'categoryId' | 'name' | 'slug'> | null {
const normalised = slug.toLowerCase();
const match = list.find(
(category) => category.slug.toLowerCase() === normalised,
  );
if (!match) return null;
return { categoryId: match.categoryId, name: match.name, slug: match.slug };
}

export function useCategorySlugAvailability(
slug: string,
excludeCategoryId?: string,
delayMs = DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS,
): UseCategorySlugAvailability {
const { all: list } = useCategoryAdminList();

const debouncedSlug = useDebouncedValue(slug, delayMs).debouncedValue;

const result = useMemo((): UseCategorySlugAvailability => {
if (!debouncedSlug || debouncedSlug.trim().length === 0) {
return { status: 'unknown', debouncedSlug: '', conflictingCategory: null };
    }

if (!isValidCategorySlug(debouncedSlug)) {
return { status: 'invalid', debouncedSlug, conflictingCategory: null };
    }

if (isCategorySlugTaken(debouncedSlug, list, excludeCategoryId)) {
return {
status: 'taken',
debouncedSlug,
conflictingCategory: findConflictingCategory(debouncedSlug, list),
      };
    }

return { status: 'available', debouncedSlug, conflictingCategory: null };
    // Re-evaluate when the debounced slug or the list changes.
  }, [debouncedSlug, list, excludeCategoryId]);

return result;
}