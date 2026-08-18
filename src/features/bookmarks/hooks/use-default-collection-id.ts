'use client';

import type { BookmarkCollection } from '@/features/bookmarks/types';
import { useCollections } from '@/features/bookmarks/hooks';

export const DEFAULT_COLLECTION_NAME = 'Favourites';

export interface UseDefaultCollectionIdResult {

defaultCollectionId: string | null;

isLoading: boolean;
}

export function selectDefaultCollectionId(
collections: ReadonlyArray<BookmarkCollection>,
): string | null {
if (collections.length === 0) {
return null;
  }

for (const collection of collections) {
if (
typeof collection.name === 'string' &&
collection.name.trim().toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()
    ) {
return collection.collectionId;
    }
  }

const sorted = [...collections].sort((a, b) => {
const aCreated = Date.parse(a.createdAt);
const bCreated = Date.parse(b.createdAt);

if (Number.isNaN(aCreated) && Number.isNaN(bCreated)) {
return a.collectionId.localeCompare(b.collectionId);
    }
if (Number.isNaN(aCreated)) return 1;
if (Number.isNaN(bCreated)) return -1;
if (aCreated !== bCreated) {
return aCreated - bCreated;
    }
return a.collectionId.localeCompare(b.collectionId);
  });

return sorted[0]?.collectionId ?? null;
}

export function useDefaultCollectionId(): UseDefaultCollectionIdResult {
const { items: collections, isLoading } = useCollections();

const defaultCollectionId = selectDefaultCollectionId(collections);

return {
defaultCollectionId,
isLoading,
  };
}
