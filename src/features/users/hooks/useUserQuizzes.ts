/**
 * `useUserQuizzes` — cursor-paginated list of quotes created by a user.
 *
 * Source epic:   Phase 1 (F-17) — public profile /profile/[name] quick-win.
 * Source ticket: F-17.
 *
 * Source of truth: `GET /api/v1/users/{userId}/quizzes` (the per-user
 * list endpoint). Wraps the verified service wrapper
 * `listUserQuizzes` from `users.profile.service.ts` in the cursor
 * pagination primitive.
 *
 * ## Public endpoint
 *
 * Unlike `userControllerGetUserQuizAnalytics`, this endpoint IS
 * public — but the `userControllerListUserQuizzesStatus` `published`
 * filter is the documented "no private listings" affordance. The
 * consumer should call `useUserQuizzes(userId, { status: 'published' })`
 * for the "Created Quizzes" public tab to avoid leaking drafts.
 *
 * ## Fetcher adapter
 *
 * The fetcher:
 *   1. Reads `cursor` and forwards to the SDK.
 *   2. Unwraps the wire envelope `{ data, meta }` to
 *      `CursorPage<QuizListItemDto>`.
 *   3. Synthesises `id` from `quizId` so `appendUniqueById`
 *      deduplication works.
 *   4. Defends against future `isHidden: true` regressions by
 *      filtering hidden rows client-side (matches the Quiz
 *      directory's defensive filter).
 *
 * ## SWR key
 *
 * The key is `['users', userId, 'quizzes', status]` so that:
 *   - The cache is keyed per userId.
 *   - Switching `status` resets the cursor (different surface).
 *   - A null userId short-circuits to the safe fallback.
 */
'use client';

import { useMemo } from 'react';

import { ApiError, projectWithId, useCursorPaginated, type ProjectWithId } from '@/lib/api';
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import {
  listUserQuizzes,
  type ListUserQuizzesParams,
} from '@/features/users/services/users.profile.service';
import type { QuizListItemDto } from '@/lib/api/generated/schemas';

export type UseUserQuizzesParams = Pick<ListUserQuizzesParams, 'status' | 'limit'>;

/**
 * Wire shape returned by `listUserQuizzes` (post-unwrap).
 */
type ListUserQuizzesResponse = {
  data?: QuizListItemDto[];
  meta?: {
    pagination?: {
      kind: 'cursor';
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

/**
 * `QuizListItemDto` carries `quizId` (not `id`). The
 * `ProjectWithId` helper (Phase 9 / P1-24) projects `quizId` onto
 * `id` so `useCursorPaginated`'s `T extends { id: string }`
 * constraint is satisfied at the type level. The runtime `Object.assign`
 * in the fetcher is the runtime seam.
 */
type QuizListItemWithId = ProjectWithId<QuizListItemDto, 'quizId'>;

export type UseUserQuizzesResult = UseCursorPaginatedResult<QuizListItemWithId>;

const EMPTY_PAGE: CursorPage<QuizListItemWithId> = Object.freeze({
  items: [] as readonly QuizListItemWithId[],
  nextCursor: null as string | null,
  hasNextPage: false,
  limit: 0,
});

/**
 * Cursor-paginated list of quizzes created by `userId`.
 *
 * Returns the safe empty pagination result when `userId` is null.
 */
export function useUserQuizzes(
  userId: string | null,
  params?: UseUserQuizzesParams,
): UseUserQuizzesResult {
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
        signal: _signal,
      }: CursorFetcherArgs<UseUserQuizzesParams>): Promise<CursorPage<QuizListItemWithId>> => {
        if (userId === null) {
          return EMPTY_PAGE;
        }
        try {
          const result = (await listUserQuizzes(userId, {
            ...(cursor ? { cursor } : {}),
            ...(params?.limit ? { limit: params.limit } : {}),
            ...(params?.status ? { status: params.status } : {}),
          })) as ListUserQuizzesResponse;

          const items = (result.data ?? []) as QuizListItemDto[];
          const visibleItems = items.filter((item) => item.isHidden !== true);
          const itemsWithId = projectWithId(visibleItems as unknown as readonly Record<string, unknown>[], 'quizId') as unknown as QuizListItemWithId[];

          const pagination = result.meta?.pagination;
          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            return EMPTY_PAGE;
          }
          throw err;
        }
      },
    [userId, params?.limit, params?.status],
  );

  return useCursorPaginated<QuizListItemWithId, UseUserQuizzesParams>({
    key: userId
      ? (['users', userId, 'quizzes', params?.status ?? 'all', params?.limit ?? null] as const)
      : (['users', '__no_user__', 'quizzes'] as const),
    fetcher,
    params: params ?? {},
    paginationKind: 'cursor',
  });
}
