

import useSWR from "swr";

import { myTournamentAnalyticsKey } from "@/features/users/types/tournament.types";
import { getMyTournamentAnalytics } from "@/features/users/services/users.profile.service";
import type { MyTournamentAnalyticsResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentAnalyticsReturn {
analytics: MyTournamentAnalyticsResponseDto | null;
isLoading: boolean;
error: Error | null;
}

export function useMyTournamentAnalytics(): UseMyTournamentAnalyticsReturn {
const { data, error, isLoading } = useSWR(
myTournamentAnalyticsKey(),
() => getMyTournamentAnalytics(),
{
revalidateOnFocus: true,
    },
  );

return {
analytics: data ?? null,
isLoading,
error: error ?? null,
  };
}
