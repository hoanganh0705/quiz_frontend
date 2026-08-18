

import useSWR from "swr";

import { myRankingKey } from "@/features/users/types/user-analytics.types";
import { getMyRanking } from "@/features/users/services/users.profile.service";
import type { UserRankingResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyRankingReturn {
ranking: UserRankingResponseDto | null;
isLoading: boolean;
error: Error | null;
}

export function useMyRanking(refreshInterval?: number): UseMyRankingReturn {
const { data, error, isLoading } = useSWR(
myRankingKey(),
() => getMyRanking(),
{
revalidateOnFocus: true,
...(refreshInterval !== undefined ? { refreshInterval } : {}),
    },
  );

return {
ranking: data ?? null,
isLoading,
error: error ?? null,
  };
}
