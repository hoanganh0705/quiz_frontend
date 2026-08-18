

import useSWR from "swr";

import { myBadgesKey } from "@/features/users/types/badge.types";
import { listMyBadges } from "@/features/users/services/users.profile.service";
import type { UserBadgeList } from "@/features/users/types/badge.types";

export interface UseMyBadgesReturn {
badges: UserBadgeList;
isLoading: boolean;
error: Error | null;
}

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
