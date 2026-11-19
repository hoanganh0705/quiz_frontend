"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { RankedTagResponseDto } from "@/lib/api/generated/schemas";

import { getTagsTrending } from "@/features/tags/services/tags.service";

export interface UseTagsTrendingParams {
  limit?: number;
}

export interface UseTagsTrendingResult {
  tags: readonly RankedTagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagsTrending(
  params: UseTagsTrendingParams = {},
): UseTagsTrendingResult {
  const key = ["tags", "trending", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getTagsTrending({ limit: params.limit });
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
