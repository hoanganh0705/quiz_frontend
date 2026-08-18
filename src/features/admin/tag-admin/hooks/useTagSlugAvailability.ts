'use client';

import { useMemo } from 'react';

import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

import { isValidTagSlug } from '../tag-slug-regex';
import { isTagSlugTaken } from '../tag-validation';
import type { TagAdminListItem } from '../tag-types';
import { useTagAdminList } from './useTagAdminList';

export const DEFAULT_SLUG_AVAILABILITY_DEBOUNCE_MS = 250;

export type SlugAvailabilityStatus =
| 'unknown'
  | 'invalid'
  | 'taken'
  | 'available';

export interface UseTagSlugAvailability {

status: SlugAvailabilityStatus;

debouncedSlug: string;

conflictingTag: Pick<TagAdminListItem, 'tagId' | 'name' | 'slug'> | null;
}

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
