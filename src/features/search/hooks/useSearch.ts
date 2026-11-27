"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";

import { search } from "@/features/search/services/search.service";
import {
  DEFAULT_SEARCH_DEBOUNCE_MS,
  DEFAULT_SEARCH_QUERY_PARAMS,
  type SearchGroup,
  type SearchQueryParams,
  type SearchQueryState,
  type SearchResponseDto,
  type SearchResultKind,
} from "@/features/search/types/search.types";
import {
  SEARCH_MIN_QUERY_LENGTH,
  adaptWireToFeature,
  mapApiErrorToSearchCode,
} from "@/features/search/utils/search-adapter";

import type { SearchResponseDto as SearchResponseWireDto } from "@/lib/api/generated/schemas/searchResponseDto";

export { SEARCH_MIN_QUERY_LENGTH };

export const SEARCH_MAX_LIMIT = 20;

export const SEARCH_DEFAULT_LIMIT = 20;

export interface UseSearchResult {
  groups: SearchResponseDto["groups"] | null;

  query: string;

  debouncedQuery: string;

  state: SearchQueryState;

  isLoading: boolean;

  isStale: boolean;

  error: ApiError | null;

  hasResults: boolean;

  retry: () => Promise<void>;

  cancel: () => void;
}

export function useSearch(
  params: SearchQueryParams = DEFAULT_SEARCH_QUERY_PARAMS,
  options: { debounceMs?: number } = {},
): UseSearchResult {
  const debounceMs = options.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

  const rawQuery = params.q ?? "";
  const trimmedQuery = useMemo(() => rawQuery.trim(), [rawQuery]);
  const { debouncedValue: debouncedQuery } = useDebouncedValue(
    trimmedQuery,
    debounceMs,
  );

  const clampedLimit = useMemo(() => {
    if (typeof params.limit !== "number") return undefined;
    return Math.min(Math.max(1, params.limit), SEARCH_MAX_LIMIT);
  }, [params.limit]);

  return useSearchInner({
    trimmedQuery,
    debouncedQuery,
    clampedLimit,
    kinds: params.kinds,
  });
}

interface UseSearchInnerArgs {
  trimmedQuery: string;
  debouncedQuery: string;
  clampedLimit: number | undefined;
  kinds: SearchResultKind[] | undefined;
}

function useSearchInner(args: UseSearchInnerArgs): UseSearchResult {
  const { trimmedQuery, debouncedQuery, clampedLimit } = args;

  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [groups, setGroups] = useState<SearchResponseDto["groups"] | null>(
    null,
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchForQuery = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      const currentEpoch = epochRef.current;
      try {
        const raw = await search(debouncedQuery, {
          ...(clampedLimit !== undefined ? { limit: clampedLimit } : {}),
        });

        if (signal.aborted || currentEpoch !== epochRef.current) {
          return;
        }

        const unwrapped = inspectEnvelope<SearchResponseWireDto>(raw);
        const wire: SearchResponseWireDto | null =
          unwrapped.kind === "envelope" && unwrapped.value
            ? unwrapped.value
            : unwrapped.kind === "passthrough"
              ? (unwrapped.value as SearchResponseWireDto)
              : null;

        const adapted = wire
          ? adaptWireToFeature(wire)
          : { query: debouncedQuery, groups: {} };
        setGroups(adapted.groups);
        setError(null);
      } catch (cause: unknown) {
        if (signal.aborted || currentEpoch !== epochRef.current) {
          return;
        }

        if (isApiError(cause)) {
          const searchCode = mapApiErrorToSearchCode(
            cause,
            debouncedQuery.length,
          );
          setError(cause.withCode(searchCode));
          setGroups(null);
        } else {
          setError(
            ApiError.fromInput({
              status: 0,
              code: "GLOBAL_INTERNAL_ERROR",
              message:
                cause instanceof Error ? cause.message : "Unknown search error",
            }),
          );
          setGroups(null);
        }
      }
    },
    [debouncedQuery, clampedLimit],
  );

  useEffect(() => {
    if (debouncedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      epochRef.current += 1;
      setIsLoading(false);
      setGroups(null);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    epochRef.current += 1;
    const controller = new AbortController();
    abortRef.current = controller;
    const capturedEpoch = epochRef.current;

    setIsLoading(true);

    void fetchForQuery(controller.signal).finally(() => {
      if (capturedEpoch === epochRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, fetchForQuery]);

  const state: SearchQueryState = useMemo(() => {
    if (error) return "error";
    if (isLoading && groups !== null) return "stale";
    if (isLoading) return "fetching";
    if (debouncedQuery.length < SEARCH_MIN_QUERY_LENGTH) return "idle";
    if (groups !== null && Object.keys(groups).length === 0) {
      return "empty";
    }
    if (groups !== null) return "success";
    return "idle";
  }, [error, isLoading, groups, debouncedQuery]);

  const hasResults = useMemo(() => {
    if (!groups) return false;
    return Object.values(groups).some(
      (g) => (g as SearchGroup<unknown>).items.length > 0,
    );
  }, [groups]);

  const retry = useCallback(async () => {
    abortRef.current?.abort();
    epochRef.current += 1;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      await fetchForQuery(controller.signal);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchForQuery]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    epochRef.current += 1;
    setIsLoading(false);
  }, []);

  const isStale = isLoading && groups !== null;

  return {
    groups,
    query: trimmedQuery,
    debouncedQuery,
    state,
    isLoading,
    isStale,
    error,
    hasResults,
    retry,
    cancel,
  };
}
