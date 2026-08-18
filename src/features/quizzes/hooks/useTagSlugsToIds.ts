

'use client';

import { useCallback, useRef, useState } from 'react';

import { getTagBySlug } from '@/features/tags/services/tags.service';
import type { TagResponseDto } from '@/lib/api/generated/schemas';

export interface UseTagSlugsToIdsReturn {

tagIds: string[] | null;

isResolving: boolean;

error: string | null;

resolve: (slugs: string[]) => Promise<string[] | null>;

reset: () => void;
}

export function useTagSlugsToIds(): UseTagSlugsToIdsReturn {
const [tagIds, setTagIds] = useState<string[] | null>(null);
const [isResolving, setIsResolving] = useState(false);
const [error, setError] = useState<string | null>(null);

const cacheRef = useRef<Map<string, string>>(new Map());

const resolve = useCallback(async (slugs: string[]): Promise<string[] | null> => {

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

setTagIds(null);
setError(null);
setIsResolving(false);
  }, []);

return { tagIds, isResolving, error, resolve, reset };
}
