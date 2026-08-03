/**
 * `useMyBadges` — fetched earned badges for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B2.
 *
 * Wraps `listMyBadges` from `users.profile.service.ts` in a simple SWR hook.
 *
 * ## Deferred badge filtering (master plan §1.3)
 *
 * The backend may return badges with `deferred: true`. These are filtered
 * client-side by the service wrapper before returning data to the hook.
 * The UI never sees deferred badges.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'badges']`.
 */

import useSWR from "swr";

import { myBadgesKey } from "@/features/users/types/badge.types";
import { listMyBadges } from "@/features/users/services/users.profile.service";
import type { UserBadgeList } from "@/features/users/types/badge.types";

export interface UseMyBadgesReturn {
  badges: UserBadgeList;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch badges earned by the authenticated user.
 * Deferred badges are filtered out by the service layer.
 *
 * @param refreshInterval - Optional polling interval in ms (e.g., 60000 for 60s).
 *                         Only pass when the tab is active to avoid unnecessary requests.
 */
export function useMyBadges(refreshInterval?: number): UseMyBadgesReturn {
  const { data, error, isLoading } = useSWR(
    myBadgesKey(),
    () => listMyBadges(),
    {
      revalidateOnFocus: true,
      ...(refreshInterval !== undefined ? { refreshInterval } : {}),
    },
  );

  return {
    badges: data ?? { items: [], total: 0 },
    isLoading,
    error: error ?? null,
  };
}
