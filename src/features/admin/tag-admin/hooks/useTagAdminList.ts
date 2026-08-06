'use client';

/**
 * `features/admin/tag-admin/hooks/useTagAdminList.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C1.
 *
 * ## Purpose
 *
 * SWR-powered read hook for the tag admin list. Calls the public
 * `listTags` endpoint (the only tag-list endpoint currently available;
 * a dedicated admin endpoint is tracked as a runtime verification item in
 * `EPIC_7_3_A1.md` §6). On success, the response is split into:
 *
 *   - `active`     — rows where `deletedAt === null` (or absent)
 *   - `softDeleted` — rows where `deletedAt` is a non-null ISO 8601 String
 *   - `all`       — the full union
 *
 * Components must not call the SDK directly — they use this hook.
 */

import useSWR from 'swr';

import { ApiError } from '@/lib/api';

import { listTags } from '@/features/tags/services/tags.service';
import type {
  TagAdminListItem,
  TagListItem,
  DeletedTagListItem,
} from '../tag-types';

// ─── SWR key ───────────────────────────────────────────────────────────────

/** Stable SWR cache key for the admin tag list. */
export const TAG_ADMIN_LIST_KEY = 'tag-admin:list' as const;

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseTagAdminList {
  /** Active (non-deleted) tags. */
  active: TagListItem[];
  /** Soft-deleted tags. */
  softDeleted: DeletedTagListItem[];
  /** All tags (active + soft-deleted). */
  all: TagAdminListItem[];
  /** True while the request is in-flight. */
  isLoading: boolean;
  /** True on the first load (no stale data from cache). */
  isValidating: boolean;
  /** The typed API error, or null on success / loading. */
  error: ApiError | null;
  /**
   * Revalidates the admin tag list.
   * Call after create / update / delete / restore mutations.
   */
  mutate: () => void;
}

export function useTagAdminList(): UseTagAdminList {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    TAG_ADMIN_LIST_KEY,
    async (): Promise<TagAdminListItem[]> => {
      const result = await listTags({ limit: 100 });
      const rawItems = result.data ?? [];

      return rawItems.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    isLoading,
    isValidating,
    error: error != null && 'code' in error ? (error as ApiError) : null,
    mutate,
  };
}
