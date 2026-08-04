/**
 * `tournament.types.ts` — Story 5.2 tournament types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the tournament domain types, filter shapes,
 * cursor-pagination result shapes, and SWR cache-key factories consumed
 * by every Story 5.2 hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (tournaments.service.ts). Types extend the
 * generated SDK DTOs to add `id` aliases for deduplication, not to
 * redefine fields verbatim.
 *
 * ## Pagination kinds
 *
 * - Tournament list: cursor-based (`PaginationMetaDto`, `kind: 'cursor'`)
 * - Participants list: offset-based (`OffsetPaginationMetaDto`, `kind: 'offset'`)
 * - Leaderboard: offset-based (`OffsetPaginationMetaDto`, `kind: 'offset'`)
 *
 * ## Cursor hygiene
 *
 * Cursor fields are treated as opaque. Components never decode or construct cursors.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal keys.
 * The factories are pure (no clock, no random) so they are safe to call
 * inside `useMemo` and `useEffect` dependency arrays.
 */

import type {
  TournamentDetailResponseDto,
  TournamentLeaderboardEntryDto,
  TournamentParticipantListItemDto,
} from "@/lib/api/generated/schemas";

import type { TournamentResponseDto } from "@/lib/api/generated/schemas/tournamentResponseDto";

// ─── Status ───────────────────────────────────────────────────────────────

/**
 * Tournament lifecycle status.
 *
 * The approved statuses for Story 5.2 discovery surfaces.
 * Mutations (register/withdraw) are handled in Story 5.3.
 *
 * Maps to the generated `TournamentResponseDtoStatus` enum values.
 */
export type TournamentStatus =
  | "upcoming"
  | "registration"
  | "ongoing"
  | "finished"
  | "cancelled";

// ─── Filter shapes ────────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the tournament list page.
 *
 * The shape is intentionally flat so the
 * `useTournamentFilters` (TKT-5.2.B5) hook can serialize it to
 * URL search params one field at a time. The `cursor` field is
 * preserved through filter changes so back/forward navigation lands
 * on the same page.
 */
export interface TournamentListFilters {
  /** Status filter. `undefined` means "all statuses". */
  status?: TournamentStatus;
  /** Free-text search. Empty string means no search filter. */
  search: string;
  /** Opaque pagination cursor. `undefined` means "first page". */
  cursor?: string;
  /** Optional per-page limit. The hook defaults to a Phase-3 value. */
  limit?: number;
}

/**
 * Pagination filter for the participants list.
 *
 * Participants use offset pagination (`OffsetPaginationMetaDto`).
 */
export interface TournamentParticipantsFilters {
  /** 1-indexed page number. `undefined` means "first page". */
  page?: number;
  /** Optional per-page limit. */
  limit?: number;
}

/**
 * Pagination filter for the leaderboard.
 *
 * Leaderboard uses offset pagination (`OffsetPaginationMetaDto`).
 */
export interface TournamentLeaderboardFilters {
  /** 1-indexed page number. `undefined` means "first page". */
  page?: number;
  /** Optional per-page limit. */
  limit?: number;
}

// ─── Default filter values ─────────────────────────────────────────────────

/**
 * Default filter state for the tournament list page.
 *
 * Centralised here so the URL-sync hook, the page, and the URL
 * initializer agree on the empty filter shape.
 */
export const DEFAULT_TOURNAMENT_LIST_FILTERS: TournamentListFilters = {
  status: undefined,
  search: "",
  cursor: undefined,
  limit: undefined,
};

// ─── Page shapes ──────────────────────────────────────────────────────────

/**
 * Cursor-pagination result shape for the tournament list.
 *
 * `items` is the deduped list of `TournamentSummary`; `nextCursor`
 * is the opaque cursor the SDK returned; `hasNextPage` follows the
 * pagination metadata.
 */
export interface TournamentListPage {
  items: readonly TournamentSummary[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

/**
 * Offset-pagination result shape for the participants list.
 */
export interface TournamentParticipantsPage {
  items: readonly TournamentParticipant[];
  page: number;
  total: number;
  hasMore: boolean;
  limit: number;
}

/**
 * Offset-pagination result shape for the leaderboard.
 */
export interface TournamentLeaderboardPage {
  items: readonly TournamentLeaderboardEntry[];
  page: number;
  total: number;
  hasMore: boolean;
  limit: number;
}

// ─── Domain types ─────────────────────────────────────────────────────────

/**
 * Tournament summary for the list view.
 *
 * Extends the generated `TournamentResponseDto` with an `id` alias
 * so `appendUniqueById` deduplication in `useCursorPaginated` works.
 *
 * Note: the generated DTO uses `tournamentId`, not `id`.
 */
export type TournamentSummary = TournamentResponseDto & {
  /** Alias of `tournamentId` for SWR deduplication. */
  id: string;
};

/**
 * Tournament detail for the detail view.
 *
 * Extends the generated `TournamentDetailResponseDto` with an `id` alias.
 */
export type TournamentDetail = TournamentDetailResponseDto & {
  /** Alias of `tournamentId` for consistency with TournamentSummary. */
  id: string;
};

/**
 * Tournament participant.
 *
 * Normalised from the generated `TournamentParticipantListItemDto`.
 */
export type TournamentParticipant = TournamentParticipantListItemDto & {
  /** Alias of `userId` for SWR deduplication. */
  id: string;
};

/**
 * Leaderboard entry for a tournament.
 *
 * Normalised from the generated `TournamentLeaderboardEntryDto`.
 */
export type TournamentLeaderboardEntry = TournamentLeaderboardEntryDto & {
  /** Alias of `participantId` for SWR deduplication. */
  id: string;
  /** Alias of `totalScore` for the domain type name. */
  score: number;
};

// ─── Serialisation ────────────────────────────────────────────────────────

/**
 * Serialize the tournament list filters to a stable, URL-safe key fragment.
 *
 * Pure function used by `TOURNAMENT_CACHE_KEYS.list` and the
 * URL-sync hook. Two equal filter objects produce equal strings;
 * field order is fixed so the cache key never depends on object
 * insertion order.
 */
export function serializeTournamentFilters(
  filters: TournamentListFilters,
): string {
  const parts: string[] = [];

  if (filters.status !== undefined) {
    parts.push(`status=${filters.status}`);
  }
  if (filters.search.trim().length > 0) {
    parts.push(`q=${filters.search.trim().toLowerCase()}`);
  }
  if (filters.cursor !== undefined) {
    parts.push(`cursor=${filters.cursor}`);
  }
  if (typeof filters.limit === "number") {
    parts.push(`limit=${filters.limit}`);
  }

  return parts.join("|");
}

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.2 tournament reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const TOURNAMENT_CACHE_KEYS = {
  /**
   * SWR key for the cursor-paginated tournament list.
   *
   * Scoped by the serialised filter shape so different filter
   * combinations do not collide.
   */
  list(filters: TournamentListFilters) {
    return [
      "tournaments",
      "list",
      serializeTournamentFilters(filters),
    ] as const;
  },

  /**
   * SWR key for a single tournament detail.
   */
  detail(tournamentId: string) {
    return ["tournaments", "detail", tournamentId] as const;
  },

  /**
   * SWR key for a tournament's participants list.
   *
   * Uses offset pagination, so the key includes the page number.
   */
  participants(tournamentId: string, filters: TournamentParticipantsFilters) {
    return [
      "tournaments",
      "participants",
      tournamentId,
      `page=${filters.page ?? 1}`,
      `limit=${filters.limit ?? 20}`,
    ] as const;
  },

  /**
   * SWR key for a tournament's leaderboard.
   *
   * Uses offset pagination, so the key includes the page number.
   */
  leaderboard(
    tournamentId: string,
    filters: TournamentLeaderboardFilters,
  ) {
    return [
      "tournaments",
      "leaderboard",
      tournamentId,
      `page=${filters.page ?? 1}`,
      `limit=${filters.limit ?? 20}`,
    ] as const;
  },
} as const;
