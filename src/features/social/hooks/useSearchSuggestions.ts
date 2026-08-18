"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";

import { getSearchSuggestions } from "@/features/social/services/discovery.service";
import {
DEBOUNCE_WINDOW_MS,
SEARCH_MIN_QUERY_LENGTH,
} from "@/features/social/discovery-invariants";
import {
type SocialSearchSuggestionKind,
} from "@/features/social/discovery-discriminator";

import { useDebouncedValue } from "@/lib/utils/use-debounced-value";

export interface UseSearchSuggestionsResult {

readonly groups: Readonly<
Partial<Record<SocialSearchSuggestionKind, readonly string[]>>
  >;
readonly isLoading: boolean;
readonly error: ApiError | null;

readonly wasStale: boolean;
}

const EMPTY_GROUPS: UseSearchSuggestionsResult["groups"] = Object.freeze({});

const EMPTY_RESULT: UseSearchSuggestionsResult = Object.freeze({
groups: EMPTY_GROUPS,
isLoading: false,
error: null,
wasStale: false,
});

export function useSearchSuggestions(
query: string,
): UseSearchSuggestionsResult {

const { debouncedValue: debouncedQuery } = useDebouncedValue(
query,
DEBOUNCE_WINDOW_MS,
  );

const normalisedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

const isQueryTooShort = normalisedQuery.length < SEARCH_MIN_QUERY_LENGTH;

const [wasStale, setWasStale] = useState(false);
const [groups, setGroups] = useState<
UseSearchSuggestionsResult["groups"]
  >(EMPTY_GROUPS);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);

const isStaleRef = useRef(false);

const apiQuery = debouncedQuery.trim().toLowerCase();

useEffect(() => {

if (apiQuery.length < SEARCH_MIN_QUERY_LENGTH) {
setGroups(EMPTY_GROUPS);
setIsLoading(false);
setError(null);
setWasStale(false);
isStaleRef.current = false;
return;
    }

setWasStale(true);
isStaleRef.current = true;
setIsLoading(true);

let cancelled = false;

getSearchSuggestions(apiQuery)
      .then((result) => {
if (cancelled) return;

if (!isStaleRef.current) return;
setGroups(result.groups);
setError(null);
setWasStale(false);
isStaleRef.current = false;
setIsLoading(false);
      })
      .catch((err: unknown) => {
if (cancelled) return;
if (!isStaleRef.current) return;
if (err instanceof ApiError) {
setError(err);
        } else {
setError(
new ApiError({
status: 0,
code: "GLOBAL_INTERNAL_ERROR",
message: err instanceof Error ? err.message : "Unknown error",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
        }
isStaleRef.current = false;
setIsLoading(false);
      });

return () => {
cancelled = true;
    };
  }, [apiQuery, isStaleRef]);

if (isQueryTooShort) {
return EMPTY_RESULT;
  }

return {
groups,
isLoading,
error,
wasStale,
  };
}
