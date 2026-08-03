/**
 * `useTagSlugsToIds` — resolve tag slugs to UUIDs.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-B3.
 *
 * ## What this hook owns
 *
 * The form UI works with tag slugs (e.g. `'world-history'`) from the
 * tag picker. The backend `CreateQuizDto` expects `tagIds: string[]`
 * (UUIDs). This hook resolves slugs → UUIDs by fetching each tag's
 * detail via `getTagBySlug()`.
 *
 * ## Memoization
 *
 * The resolved slug→id map is memoized by the input set. Calling
 * `resolve(['world-history', 'geography'])` twice with the same slugs
 * only triggers one API call. Adding or removing a slug busts the cache.
 *
 * ## Error handling
 *
 * If any slug cannot be resolved (404 from `getTagBySlug`), the hook
 * sets `error` with the first unfound slug and returns `tagIds: null`.
 * Callers should not proceed to submit in this state.
 *
 * ## Empty input
 *
 * `resolve([])` with an empty array returns `tagIds: []` immediately
 * with no API call.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { getTagBySlug } from '@/features/tags/services/tags.service';
import type { TagResponseDto } from '@/lib/api/generated/schemas';

export interface UseTagSlugsToIdsReturn {
  /** `null` = unresolved or error. Populated array on success. */
  tagIds: string[] | null;
  /** `true` while resolving. */
  isResolving: boolean;
  /** Error message when a slug cannot be resolved. `null` otherwise. */
  error: string | null;
  /**
   * Resolve an array of slugs to UUIDs.
   * Resolving an empty array returns `tagIds: []` immediately.
   */
  resolve: (slugs: string[]) => Promise<string[] | null>;
  /** Reset to initial state. */
  reset: () => void;
}

export function useTagSlugsToIds(): UseTagSlugsToIdsReturn {
  const [tagIds, setTagIds] = useState<string[] | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized cache: slug → id. Survives across `resolve` calls.
  const cacheRef = useRef<Map<string, string>>(new Map());

  const resolve = useCallback(async (slugs: string[]): Promise<string[] | null> => {
    // Empty input → nothing to resolve.
    if (slugs.length === 0) {
      setTagIds([]);
      setError(null);
      return [];
    }

    setIsResolving(true);
    setError(null);

    try {
      const resolvedIds: string[] = [];

      for (const slug of slugs) {
        // Check the cache first.
        if (cacheRef.current.has(slug)) {
          resolvedIds.push(cacheRef.current.get(slug)!);
          continue;
        }

        try {
          const response = (await getTagBySlug(slug)) as {
            data?: TagResponseDto;
          };
          const tag = response.data;

          if (!tag?.tagId) {
            setError(`Tag "${slug}" not found.`);
            setTagIds(null);
            return null;
          }

          // Cache the result.
          cacheRef.current.set(slug, tag.tagId);
          resolvedIds.push(tag.tagId);
        } catch {
          setError(`Tag "${slug}" not found.`);
          setTagIds(null);
          return null;
        }
      }

      setTagIds(resolvedIds);
      return resolvedIds;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const reset = useCallback(() => {
    // Keep the cache but reset the return state.
    setTagIds(null);
    setError(null);
    setIsResolving(false);
  }, []);

  return { tagIds, isResolving, error, resolve, reset };
}
