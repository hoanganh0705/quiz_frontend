'use client';

/**
 * `features/admin/tag-admin/hooks/useTagSlugAvailability.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C6.
 *
 * ## Purpose
 *
 * Debounced slug-uniqueness pre-check hook. Reads the current admin tag list
 * and reports whether the given slug is valid and available — without
 * calling the backend. The backend is always the authoritative uniqueness
 * check; this hook eliminates obvious 409s before submit.
 *
 * Debounce: 250 ms (configurable via `delayMs`).
 *
 * Returns `unknown` while the slug is empty or still debouncing.
 *
 * ## Status values
 *
 *   - `'unknown'`   — slug is empty; caller decides what this means.
 *   - `'invalid'`  — slug fails the `TAG_SLUG_REGEX` check.
 *   - `'taken'`    — valid slug, but already used by another tag.
 *   - `'available'` — valid slug and not taken in the local list.
 */

import { useMemo } from 'react';

import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

import { isValidTagSlug } from '../tag-slug-regex';
import { isTagSlugTaken } from '../tag-validation';
import type { TagAdminListItem } from '../tag-types';
import { useTagAdminList } from './useTagAdminList';

/** Default debounce delay for slug availability checks. */
export const DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS = 250;

export type SlugAvailabilityStatus =
  | 'unknown'
  | 'invalid'
  | 'taken'
  | 'available';

export interface UseTagSlugAvailability {
  /**
   * The current availability result for the debounced slug value.
   *
   * Transitions:
   *   - slug empty / still debouncing → `unknown`
   *   - slug invalid (regex fail) → `invalid`
   *   - slug valid but taken → `taken` + `conflictingTag`
   *   - slug valid and free → `available`
   */
  status: SlugAvailabilityStatus;
  /**
   * The debounced slug value that was checked.
   * Useful to confirm the debounce settled on the expected value.
   */
  debouncedSlug: string;
  /**
   * The matching tag when `status === 'taken'`, otherwise null.
   * Contains `{ tagId, name, slug }` of the conflicting tag.
   */
  conflictingTag: Pick<TagAdminListItem, 'tagId' | 'name' | 'slug'> | null;
}

/**
 * Returns the tag in `list` whose slug (case-insensitive) matches `slug`.
 */
function findConflictingTag(
  slug: string,
  list: readonly TagAdminListItem[],
): Pick<TagAdminListItem, 'tagId' | 'name' | 'slug'> | null {
  const normalised = slug.toLowerCase();
  const match = list.find(
    (tag) => tag.slug.toLowerCase() === normalised,
  );
  if (!match) return null;
  return { tagId: match.tagId, name: match.name, slug: match.slug };
}

/**
 * Debounced slug availability pre-check.
 *
 * @param slug       — the live slug value from the input (not debounced).
 * @param excludeTagId — tag id to exclude from the conflict check (self-editing).
 * @param delayMs    — debounce delay in ms; defaults to 250.
 */
export function useTagSlugAvailability(
  slug: string,
  excludeTagId?: string,
  delayMs = DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS,
): UseTagSlugAvailability {
  const { all: list } = useTagAdminList();

  const debouncedSlug = useDebouncedValue(slug, delayMs).debouncedValue;

  const result = useMemo((): UseTagSlugAvailability => {
    if (!debouncedSlug || debouncedSlug.trim().length === 0) {
      return { status: 'unknown', debouncedSlug: '', conflictingTag: null };
    }

    if (!isValidTagSlug(debouncedSlug)) {
      return { status: 'invalid', debouncedSlug, conflictingTag: null };
    }

    if (isTagSlugTaken(debouncedSlug, list, excludeTagId)) {
      return {
        status: 'taken',
        debouncedSlug,
        conflictingTag: findConflictingTag(debouncedSlug, list),
      };
    }

    return { status: 'available', debouncedSlug, conflictingTag: null };
    // Re-evaluate when the debounced slug or the list changes.
  }, [debouncedSlug, list, excludeTagId]);

  return result;
}
