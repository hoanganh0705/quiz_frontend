"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { TagResponseDto } from "@/lib/api/generated/schemas";

import { getRelatedTags } from "@/features/tags/services/tags.service";

export interface UseTagRelatedParams {
  limit?: number;
}

export interface UseTagRelatedResult {
  tags: readonly TagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagRelated(
  slug: string,
  params: UseTagRelatedParams = {},
): UseTagRelatedResult {
  const key = ["tag", slug, "related", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getRelatedTags(slug, { limit: params.limit });
        return result.data ?? [];
      },
    },
    getQueryClient(),
  );

  return {
    tags: data ?? [],
    isLoading,
    error: error instanceof ApiError ? error : null,
  };
}
