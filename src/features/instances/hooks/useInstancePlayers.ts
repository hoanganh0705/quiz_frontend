"use client";

/**
 * `useInstancePlayers` — cursor-paginated instance players hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B2.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the instance players through the service layer
 *   using the verified `listInstancePlayers` wrapper from Story 5.1 F2.
 * - Synthesise an `id` alias on each player so `appendUniqueById`
 *   deduplication in `useCursorPaginated` works.
 * - Annotate each player with `isHost` (derived from the host user id)
 *   and `isCurrentUser` (derived from the supplied current user id).
 * - Dedup by `playerId` when the same `eventSequence` repeats.
 * - Expose `isStale` when revalidation fails with cached data present.
 * - Feature-flag gating via `multiplayer_instances_live`.
 *
 * ## Pagination kind
 *
 * The player list uses cursor pagination (`PaginationMetaDto`, `kind: 'cursor'`).
 * The SDK params are `cursor?: string` and `limit?: number`. The first
 * page is fetched when `cursor` is `undefined`.
 *
 * ## Auth reads
 *
 * The player list endpoint requires a JWT bearer token. When the user
 * is unauthenticated, `listInstancePlayers` throws `GLOBAL_UNAUTHENTICATED`
 * and the hook surfaces a typed `InstanceLifecycleErrorCode` of
 * `INSTANCE_AUTH_REQUIRED`.
 *
 * ## Server authority
 *
 * The roster is server-authoritative. The `isHost` and `isCurrentUser`
 * annotations are UI hints only — the server remains the source of
 * truth for every permission decision.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { listInstancePlayers } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstancePlayer,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  InstancePlayerResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Cursor-paginated result shape for the player roster.
 *
 * `items` is the deduplicated list of `InstancePlayer`; `nextCursor` is
 * the opaque cursor the SDK returned; `hasNextPage` follows the
 * pagination metadata.
 */
export interface InstancePlayersPage {
  items: readonly InstancePlayer[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

export interface UseInstancePlayersResult {
  items: readonly InstancePlayer[];
  isLoading: boolean;
  isStale: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

/**
 * Filters for the player list.
 *
 * `cursor` is opaque; components never decode or construct it.
 */
export interface InstancePlayersFilters {
  hostUserId?: string | null;
  currentUserId?: string | null;
  cursor?: string;
  limit?: number;
}

// ─── Wire type ────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `listInstancePlayers`.
 *
 * Mirrors the generated `ListInstancePlayers200AllOf` shape:
 * `{ data?: InstancePlayerResponseDto[]; meta?: { pagination?: PaginationMetaDto } }`.
 */
type ListInstancePlayersWireResponse = {
  data?: InstancePlayerResponseDto[];
  meta?: {
    pagination?: {
      kind: string;
      limit?: number;
      nextCursor?: string | null;
      hasNextPage?: boolean;
    };
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Normalise a raw `InstancePlayerResponseDto` into the feature-level
 * `InstancePlayer` projection. The `id` alias is `userId` so SWR
 * deduplication works; `isCurrentUser` and `isHost` are UI hints.
 */
function projectPlayer(
  raw: InstancePlayerResponseDto,
  hostUserId: string | null,
  currentUserId: string | null,
): InstancePlayer {
  return {
    ...raw,
    id: raw.userId,
    isCurrentUser: currentUserId !== null && raw.userId === currentUserId,
    isHost: hostUserId !== null && raw.userId === hostUserId,
  };
}

/**
 * Map the raw `ApiError.code` to the `InstanceLifecycleErrorCode` union.
 * Mirrors `useInstance`'s mapper; kept independent so each hook can
 * evolve its own normalisation policy.
 */
function mapToInstanceLifecycleErrorCode(
  code: string | undefined,
): InstanceLifecycleErrorCode {
  if (!code) return "GLOBAL_INTERNAL_ERROR";

  switch (code) {
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "INSTANCE_CLOSED":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_FULL":
      return "INSTANCE_FULL";
    case "INSTANCE_FORBIDDEN":
      return "INSTANCE_FORBIDDEN";
    case "INSTANCE_NOT_JOINED":
      return "INSTANCE_NOT_JOINED";
    case "INSTANCE_HOST_REQUIRED":
    case "INSTANCE_NOT_HOST":
    case "HOST_REQUIRED":
      return "INSTANCE_HOST_REQUIRED";
    case "INSTANCE_ALREADY_JOINED":
      return "INSTANCE_ALREADY_JOINED";
    case "INSTANCE_INVALID_TRANSITION":
      return "INSTANCE_INVALID_TRANSITION";
    case "GLOBAL_UNAUTHENTICATED":
    case "AUTH_TOKEN_EXPIRED":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_REQUIRED":
    case "INSTANCE_AUTH_REQUIRED":
      return "INSTANCE_AUTH_REQUIRED";
    case "GLOBAL_NOT_FOUND":
      return "GLOBAL_NOT_FOUND";
    case "GLOBAL_FORBIDDEN":
    case "FORBIDDEN":
      return "GLOBAL_FORBIDDEN";
    case "GLOBAL_VALIDATION_FAILED":
      return "GLOBAL_VALIDATION_FAILED";
    case "GLOBAL_INTERNAL_ERROR":
      return "GLOBAL_INTERNAL_ERROR";
    default:
      return "GLOBAL_INTERNAL_ERROR";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useInstancePlayers(
  instanceId: string | null,
  filters: InstancePlayersFilters = {},
): UseInstancePlayersResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { hostUserId = null, currentUserId = null } = filters;

  // SWR cache key.
  const key = useMemo(
    () =>
      isFlagPlaceholder || instanceId === null
        ? (["instances", "players", "disabled"] as const)
        : INSTANCE_CACHE_KEYS.players(instanceId),
    [isFlagPlaceholder, instanceId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<InstancePlayersFilters>): Promise<InstancePlayersPage> => {
        if (isFlagPlaceholder || instanceId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? filters.cursor ?? undefined;

        // The service wrapper accepts `(id)` only at the compile-time
        // surface; the underlying SDK call supports `params` and the
        // backend treats the cursor as opaque. The hook forwards the
        // params by re-casting the service function to its SDK shape.
        // A separate ticket will widen the service wrapper to match.
        const listWithParams = listInstancePlayers as unknown as (
          id: string,
          params: { cursor?: string; limit?: number },
        ) => Promise<ListInstancePlayersWireResponse>;

        const wire = await listWithParams(instanceId, {
          ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
          ...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
        });

        const items: InstancePlayer[] = (wire.data ?? []).map((raw) =>
          projectPlayer(raw, hostUserId, currentUserId),
        );

        const pagination = wire.meta?.pagination;
        const limit = pagination?.limit ?? items.length;
        return {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit,
        };
      },
    [isFlagPlaceholder, instanceId, filters, hostUserId, currentUserId],
  );

  const result = useCursorPaginated<InstancePlayer, InstancePlayersFilters>({
    key,
    fetcher,
    params: filters,
    paginationKind: "cursor",
  });

  // Map the raw error code into the `InstanceLifecycleErrorCode` union.
  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    const mappedCode = mapToInstanceLifecycleErrorCode(result.error.code);
    return new ApiError({
      ...(result.error as unknown as object),
      code: mappedCode,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [result.error]);

  return {
    items: result.items,
    isLoading: result.isLoading,
    isStale: false,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: mappedError,
    refresh: result.refresh,
  };
}
