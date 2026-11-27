"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { updateTag } from "@/features/admin/services/tag-admin.service";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { broadcastTagAdminInvalidate } from "../cache/tag-cross-tab";
import { TAG_ADMIN_LIST_KEY } from "./useTagAdminList";

import type { TagDto, TagUpdateDto } from "../tag-types";

export interface UseUpdateTag {
  update: (id: string, input: TagUpdateDto) => Promise<TagDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useUpdateTag(): UseUpdateTag {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const update = useCallback(
    async (id: string, input: TagUpdateDto): Promise<TagDto> => {
      abortRef.current?.();
      setIsPending(true);
      setError(null);

      const newSlug = input.slug;

      try {
        const result = await updateTag(id, input);

        const qc = getQueryClient();
        const invalidations: Promise<void>[] = [
          qc.invalidateQueries({ queryKey: [TAG_ADMIN_LIST_KEY] }),
          qc.invalidateQueries({ queryKey: TAG_KEYS.all }),
        ];
        if (newSlug) {
          invalidations.push(
            qc.invalidateQueries({
              queryKey: TAG_KEYS.detail(newSlug),
            }),
          );
        }
        await Promise.all(invalidations);

        broadcastTagAdminInvalidate("update", id);
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
