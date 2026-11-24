"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { listInstancePlayers } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstancePlayer,
} from "@/features/instances/types/instance.types";

import type { InstancePlayerResponseDto } from "@/lib/api/generated/schemas";

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

export interface InstancePlayersFilters {
  hostUserId?: string | null;
  currentUserId?: string | null;
  cursor?: string;
  limit?: number;
}

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

export function useInstancePlayers(
  instanceId: string | null,
  filters: InstancePlayersFilters = {},
): UseInstancePlayersResult {
  const { hostUserId = null, currentUserId = null, limit, cursor } = filters;

  const key = useMemo(
    () =>
      instanceId === null
        ? (["instances", "players", "disabled"] as const)
        : INSTANCE_CACHE_KEYS.players(instanceId),
    [instanceId],
  );

  const serverParams = useMemo(
    () => ({
      ...(typeof limit === "number" ? { limit } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [limit, cursor],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor: pageCursor,
      }: CursorFetcherArgs<Record<string, unknown>>): Promise<InstancePlayersPage> => {
        if (instanceId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = pageCursor ?? cursor ?? undefined;

        const listWithParams = listInstancePlayers as unknown as (
          id: string,
          params: { cursor?: string; limit?: number },
        ) => Promise<ListInstancePlayersWireResponse>;

        const wire = await listWithParams(instanceId, {
          ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
          ...(typeof limit === "number" ? { limit } : {}),
        });

        const rawItems: InstancePlayerResponseDto[] = Array.isArray(wire)
          ? wire
          : Array.isArray((wire as ListInstancePlayersWireResponse)?.data)
            ? (wire as ListInstancePlayersWireResponse).data!
            : [];

        const items: InstancePlayer[] = rawItems.map((raw) =>
          projectPlayer(raw, null, null),
        );

        const pagination = !Array.isArray(wire)
          ? wire.meta?.pagination
          : undefined;
        const pageLimit = pagination?.limit ?? items.length;
        return {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pageLimit,
        };
      },
    [instanceId, cursor, limit],
  );

  const result = useCursorPaginated<InstancePlayer, Record<string, unknown>>({
    key,
    fetcher,
    params: serverParams,
    paginationKind: "cursor",
    enabled: instanceId !== null,
    staleTime: 30_000,
  });

  const projectedItems = useMemo(() => {
    return result.items.map((raw) =>
      projectPlayer(
        raw as unknown as InstancePlayerResponseDto,
        hostUserId,
        currentUserId,
      ),
    );
  }, [result.items, hostUserId, currentUserId]);

  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    const mappedCode = mapToInstanceLifecycleErrorCode(result.error.code);
    return new ApiError({
      ...(result.error as unknown as object),
      code: mappedCode,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [result.error]);

  return {
    items: projectedItems,
    isLoading: result.isLoading,
    isStale: false,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: mappedError,
    refresh: result.refresh,
  };
}
