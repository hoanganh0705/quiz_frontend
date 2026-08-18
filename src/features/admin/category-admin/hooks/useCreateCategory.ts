'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';

import { createCategory } from '@/features/admin/services/category-admin.service';
import {
CATEGORY_ADMIN_LIST_KEY,
publicCategoriesKeyMatcher,
} from '../cache/category-cache-keys';
import {
broadcastCategoryAdminInvalidate,
} from '../cache/category-cross-tab';
import type { CategoryCreateDto, CategoryDto } from '../category-types';

export interface UseCreateCategory {
create: (input: CategoryCreateDto) => Promise<CategoryDto>;
isPending: boolean;
error: ApiError | null;
reset: () => void;
}

export function useCreateCategory(): UseCreateCategory {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const abortRef = useRef<(() => void) | null>(null);

const create = useCallback(
async (input: CategoryCreateDto): Promise<CategoryDto> => {
abortRef.current?.();
setIsPending(true);
setError(null);

try {
const result = await createCategory(input);
await Promise.all([
globalMutate(CATEGORY_ADMIN_LIST_KEY),
globalMutate(publicCategoriesKeyMatcher),
        ]);
broadcastCategoryAdminInvalidate('create', result.categoryId);
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
    },
[],
  );

const reset = useCallback(() => {
abortRef.current?.();
setError(null);
setIsPending(false);
  }, []);

return { create, isPending, error, reset };
}