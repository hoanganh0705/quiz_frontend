import { getQueryClient } from "@/providers/QueryProvider";

import {
  TOURNAMENT_CACHE_KEYS,
  type TournamentListFilters,
} from "@/features/tournaments/types/tournament.types";

export const TOURNAMENT_ADMIN_LIST_PREFIX = "tournament-admin:list" as const;

export interface TournamentAdminListKeyParams {
  status?: string;
  search?: string;
  cursor?: string;
}

export function tournamentAdminListKey(
  params: TournamentListFilters = { search: "" },
): string {
  const parts: string[] = [TOURNAMENT_ADMIN_LIST_PREFIX];

  if (params.status !== undefined && params.status) {
    parts.push(`status=${params.status}`);
  }
  if (params.search !== undefined && params.search.trim() !== "") {
    parts.push(`q=${params.search.trim().toLowerCase()}`);
  }
  if (params.cursor !== undefined) {
    parts.push(`cursor=${params.cursor}`);
  }

  return parts.join(":");
}

export const adminListKey = tournamentAdminListKey;

export function tournamentKey(
  tournamentId: string,
): readonly ["tournaments", "detail", string] {
  return TOURNAMENT_CACHE_KEYS.detail(tournamentId);
}

export const PUBLIC_TOURNAMENTS_PREFIX = "tournaments:" as const;

export function publicTournamentKeyMatcher(key: unknown): boolean {
  if (typeof key === "string") {
    return key.startsWith(PUBLIC_TOURNAMENTS_PREFIX);
  }
  if (Array.isArray(key)) {
    const head = key[0];
    if (typeof head === "string" && head === "tournaments") {
      return true;
    }

    return key.some(
      (segment) =>
        typeof segment === "string" &&
        segment.startsWith(PUBLIC_TOURNAMENTS_PREFIX),
    );
  }
  return false;
}

export function adminListKeyMatcher(key: unknown): boolean {
  if (typeof key === "string") {
    return key.startsWith(TOURNAMENT_ADMIN_LIST_PREFIX);
  }
  return false;
}

export async function invalidateTournamentAdminList(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<unknown> {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      predicate: (query) => adminListKeyMatcher(query.queryKey[0]),
    });
  } catch {}
  if (mutate) {
    return mutate(adminListKeyMatcher);
  }
}

export async function invalidateTournamentAdminListByParams(
  params: TournamentListFilters,
  mutate?: (key: unknown) => unknown,
): Promise<unknown> {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: [tournamentAdminListKey(params)] });
  } catch {}
  if (mutate) {
    return mutate(tournamentAdminListKey(params));
  }
}

export async function invalidateTournamentById(
  tournamentId: string,
  mutate?: (key: unknown) => unknown,
): Promise<unknown> {
  const detailKey = tournamentKey(tournamentId);
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: detailKey });
  } catch {}
  if (mutate) {
    return mutate(detailKey);
  }
}

export async function invalidatePublicTournamentCaches(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<unknown> {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      predicate: (query) => publicTournamentKeyMatcher(query.queryKey),
    });
  } catch {}
  if (mutate) {
    return mutate(publicTournamentKeyMatcher);
  }
}

export async function invalidateAllTournamentCaches(
  tournamentId: string,
  mutate?: (keyOrMatcher: any) => unknown,
): Promise<unknown[]> {
  await invalidateTournamentAdminList(mutate);
  await invalidateTournamentById(tournamentId, mutate);
  await invalidatePublicTournamentCaches(mutate);

  return [];
}
