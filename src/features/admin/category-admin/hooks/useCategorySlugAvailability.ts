'use client';

/**
 * `features/admin/category-admin/hooks/useCategorySlugAvailability.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.C6.
 *
 * ## Purpose
 *
 * Debounced slug-uniqueness pre-check hook. Reads the current admin
 * category list and reports whether the given slug is valid and
 * available — without calling the backend. The backend is always the
 * authoritative uniqueness check; this hook eliminates obvious 409s
 * before submit.
 *
 * Debounce: 250 ms (configurable via `delayMs`).
 *
 * Returns `unknown` while the slug is empty or still debouncing.
 *
 * ## Status values
 *
 *   - `'unknown'`   — slug is empty; caller decides what this means.
 *   - `'invalid'`  — slug fails the `CATEGORY_SLUG_REGEX` check.
 *   - `'taken'`    — valid slug, but already used by another category.
 *   - `'available'` — valid slug and not taken in the local list.
 *
 * Mirrors `useTagSlugAvailability` (TKT-7.3.C6).
 */

import { useMemo } from 'react';

import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

import { isValidCategorySlug } from '../category-slug-regex';
import { isCategorySlugTaken } from '../category-validation';
import type { CategoryAdminListItem } from '../category-types';
import { useCategoryAdminList } from './useCategoryAdminList';

/** Default debounce delay for slug availability checks. */
export const DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS = 250;

export type SlugAvailabilityStatus =
  | 'unknown'
  | 'invalid'
  | 'taken'
  | 'available';

export interface UseCategorySlugAvailability {
  /**
   * The current availability result for the debounced slug value.
   *
   * Transitions:
   *   - slug empty / still debouncing → `unknown`
   *   - slug invalid (regex fail) → `invalid`
   *   - slug valid but taken → `taken` + `conflictingCategory`
   *   - slug valid and free → `available`
   */
  status: SlugAvailabilityStatus;
  /** The debounced slug value that was checked. */
  debouncedSlug: string;
  /**
   * The matching category when `status === 'taken'`, otherwise null.
   * Contains `{ categoryId, name, slug }` of the conflicting category.
   */
  conflictingCategory: Pick<
    CategoryAdminListItem,
    'categoryId' | 'name' | 'slug'
  > | null;
}

/**
 * Returns the category in `list` whose slug (case-insensitive) matches `slug`.
 */
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

/**
 * Debounced slug availability pre-check.
 *
 * @param slug       — the live slug value from the input (not debounced).
 * @param excludeCategoryId — category id to exclude from the conflict
 *   check (self-editing).
 * @param delayMs    — debounce delay in ms; defaults to 250.
 */
export function useCategorySlugAvailability(
  slug: string,
  excludeCategoryId?: string,
  delayMs = DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS,
): UseCategorySlugAvailability {
  const { all: list } = useCategoryAdminList();

  const debouncedSlug = useDebouncedValue(slug, delayMs);

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