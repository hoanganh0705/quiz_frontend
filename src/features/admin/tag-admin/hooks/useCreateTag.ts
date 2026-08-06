'use client';

/**
 * `features/admin/tag-admin/hooks/useCreateTag.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C2.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';

import { createTag } from '@/features/admin/services/tag-admin.service';
import type { TagCreateDto, TagDto } from '../tag-types';
import { TAG_ADMIN_LIST_KEY } from './useTagAdminList';
import {
  broadcastTagAdminInvalidate,
} from '../cache/tag-cross-tab';

const PUBLIC_TAGS_KEY = 'tags:directory' as const;

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
      await Promise.all([
        globalMutate(TAG_ADMIN_LIST_KEY),
        globalMutate(PUBLIC_TAGS_KEY),
      ]);
      broadcastTagAdminInvalidate('create', result.tagId);
      setIsPending(false);
      return result;
    } catch (thrown: unknown) {
      setIsPending(false);
      const apiError =
        thrown instanceof ApiError
          ? thrown
          : new ApiError(thrown as never);
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
