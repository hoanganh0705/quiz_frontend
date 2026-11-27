"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { listTags } from "@/features/tags/services/tags.service";

import type { TagResponseDto } from "@/lib/api/generated/schemas";
import type { CursorPage } from "@/lib/api/use-cursor-paginated.types";

export interface UseTagsDirectoryQuery {
  filter: string;

  limit?: number;
}

interface UseTagsDirectoryParams {
  limit?: number;
}

type TagDirItem = TagResponseDto & { id: string };

export function useTagsDirectory(query: UseTagsDirectoryQuery) {
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
        params,
        signal,
      }: {
        cursor: string | null;
        params: UseTagsDirectoryParams;
        signal?: AbortSignal;
      }): Promise<CursorPage<TagDirItem>> => {
        try {
          const result = await listTags({
            cursor: cursor ?? undefined,
            limit: params.limit,
            signal,
          });
          const items = result.data ?? [];
          const itemsWithId = projectWithId(items, "tagId");

          const pagination = result.meta?.pagination;
          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            };
          }
          throw err;
        }
      },
    [],
  );

  const result = useCursorPaginated<TagDirItem, UseTagsDirectoryParams>({
    key: TAG_KEYS.directory(query.limit),
    fetcher,
    params: { limit: query.limit },
    paginationKind: "cursor",
  });

  const wireItems = result.items as readonly TagResponseDto[];

  const sortedItems = useMemo(() => {
    if (wireItems.length <= 1) {
      return wireItems;
    }
    return [...wireItems].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [wireItems]);

  const filteredItems = useMemo(() => {
    const trimmed = query.filter.trim().toLowerCase();
    if (!trimmed) {
      return sortedItems;
    }
    return sortedItems.filter(
      (tag) =>
        tag.slug.toLowerCase().includes(trimmed) ||
        tag.name.toLowerCase().includes(trimmed),
    );
  }, [sortedItems, query.filter]);

  return {
    ...result,
    items: filteredItems,
    loadedCount: sortedItems.length,
  };
}
