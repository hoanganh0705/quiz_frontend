"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { updateCategory } from "@/features/admin/services/category-admin.service";
import {
  CATEGORY_ADMIN_LIST_KEY,
  categorySlugKey,
  publicCategoriesKeyMatcher,
} from "../cache/category-cache-keys";
import { broadcastCategoryAdminInvalidate } from "../cache/category-cross-tab";
import type { CategoryDto, CategoryUpdateDto } from "../category-types";

export interface UseUpdateCategory {
  update: (id: string, input: CategoryUpdateDto) => Promise<CategoryDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useUpdateCategory(): UseUpdateCategory {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const update = useCallback(
    async (id: string, input: CategoryUpdateDto): Promise<CategoryDto> => {
      abortRef.current?.();
      setIsPending(true);
      setError(null);

      const newSlug = input.slug;

      try {
        const result = await updateCategory(id, input);

        const qc = getQueryClient();
        const invalidations: Promise<void>[] = [
          qc.invalidateQueries({ queryKey: [CATEGORY_ADMIN_LIST_KEY] }),
          qc.invalidateQueries({
            predicate: (query) => publicCategoriesKeyMatcher(query.queryKey),
          }),
        ];
        if (newSlug) {
          invalidations.push(
            qc.invalidateQueries({
              queryKey: [categorySlugKey(newSlug)],
            }),
          );
        }
        await Promise.all(invalidations);

        broadcastCategoryAdminInvalidate("update", id);
        setIsPending(false);
        return result;
      } catch (thrown: unknown) {
        setIsPending(false);
        const apiError =
          thrown instanceof ApiError ? thrown : new ApiError(thrown as never);
        setError(apiError);
        throw apiError;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.();
    setError(null);
    setIsPending(false);
  }, []);

  return { update, isPending, error, reset };
}
