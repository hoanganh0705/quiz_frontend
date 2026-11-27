"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { createTag } from "@/features/admin/services/tag-admin.service";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { broadcastTagAdminInvalidate } from "../cache/tag-cross-tab";
import { TAG_ADMIN_LIST_KEY } from "./useTagAdminList";

import type { TagCreateDto, TagDto } from "../tag-types";

export interface UseCreateTag {
  create: (input: TagCreateDto) => Promise<TagDto>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useCreateTag(): UseCreateTag {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const create = useCallback(async (input: TagCreateDto): Promise<TagDto> => {
    abortRef.current?.();
    setIsPending(true);
    setError(null);

    try {
      const result = await createTag(input);
      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({ queryKey: [TAG_ADMIN_LIST_KEY] }),
        qc.invalidateQueries({ queryKey: TAG_KEYS.all }),
      ]);
      broadcastTagAdminInvalidate("create", result.tagId);
      setIsPending(false);
      return result;
    } catch (thrown: unknown) {
      setIsPending(false);
      const apiError =
        thrown instanceof ApiError ? thrown : new ApiError(thrown as never);
      setError(apiError);
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.();
    setError(null);
    setIsPending(false);
  }, []);

  return { create, isPending, error, reset };
}
