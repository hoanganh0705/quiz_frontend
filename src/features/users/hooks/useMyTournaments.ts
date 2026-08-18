

import useSWR from "swr";

import { myTournamentsKey } from "@/features/users/types/tournament.types";
import { listMyTournaments } from "@/features/users/services/users.profile.service";
import type { MyTournamentItemDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentsReturn {
tournaments: MyTournamentItemDto[];
isLoading: boolean;
error: Error | null;
}

export function useMyTournaments(): UseMyTournamentsReturn {
const { data, error, isLoading } = useSWR(
myTournamentsKey(),
() => listMyTournaments(),
{
revalidateOnFocus: true,
    },
  );

const tournaments = (data?.data ?? []) as MyTournamentItemDto[];

return {
tournaments,
isLoading,
error: error ?? null,
  };
}
