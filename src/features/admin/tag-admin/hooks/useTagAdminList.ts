"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { listTags } from "@/features/tags/services/tags.service";
import type {
  TagAdminListItem,
  TagListItem,
  DeletedTagListItem,
} from "../tag-types";

export const TAG_ADMIN_LIST_KEY = "tag-admin:list" as const;

export interface UseTagAdminList {
  active: TagListItem[];

  softDeleted: DeletedTagListItem[];

  all: TagAdminListItem[];

  isLoading: boolean;

  isValidating: boolean;

  error: ApiError | null;

  mutate: () => void;
}

export function useTagAdminList(): UseTagAdminList {
  const { data, error, isLoading, isFetching, refetch } = useQuery<
    TagAdminListItem[],
    ApiError
  >(
    {
      queryKey: [TAG_ADMIN_LIST_KEY],
      queryFn: async (): Promise<TagAdminListItem[]> => {
        const result = await listTags({ limit: 100 });
        const rawItems = result.data ?? [];

        return rawItems.map((item) => {
          const raw = item as any;
          if (raw.deletedAt && raw.deletedAt !== null) {
            return {
              tagId: item.tagId as string,
              name: item.name as string,
              slug: item.slug as string,
              createdAt: item.createdAt as string,
              updatedAt: item.updatedAt as string,
              deletedAt: String(raw.deletedAt),
            } satisfies DeletedTagListItem;
          }
          return {
            tagId: item.tagId as string,
            name: item.name as string,
            slug: item.slug as string,
            createdAt: item.createdAt as string,
            updatedAt: item.updatedAt as string,
            deletedAt: null,
          } satisfies TagListItem;
        });
      },
    },
    getQueryClient(),
  );

  const items: TagAdminListItem[] = data ?? [];
  const active: TagListItem[] = items.filter(
    (tag) => tag.deletedAt === null,
  ) as TagListItem[];
  const softDeleted: DeletedTagListItem[] = items.filter(
    (tag) => tag.deletedAt !== null,
  ) as DeletedTagListItem[];

  return {
    active,
    softDeleted,
    all: items,
    isLoading: isLoading && data === undefined,
    isValidating: isFetching,
    error: error != null && "code" in error ? (error as ApiError) : null,
    mutate: () => {
      void refetch();
    },
  };
}
