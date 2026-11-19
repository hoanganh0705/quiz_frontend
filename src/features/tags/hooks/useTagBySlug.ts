"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { TagResponseDto } from "@/lib/api/generated/schemas";

import { getTagBySlug } from "@/features/tags/services/tags.service";

export interface UseTagBySlugResult {
  tag: TagResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

export function useTagBySlug(slug: string): UseTagBySlugResult {
  const key = ["tag", slug] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getTagBySlug(slug);
        return result.data ?? null;
      },
    },
    getQueryClient(),
  );

  const apiError = error instanceof ApiError ? error : null;
  const notFound = apiError?.status === 404;

  return {
    tag: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  };
}
