"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import {
DEFAULT_SEARCH_QUERY_PARAMS,
SEARCH_CACHE_KEYS,
type SearchErrorCode,
type SearchGroup,
type SearchQueryParams,
type SearchQueryState,
type SearchResponseDto,
type SearchResultKind,
} from "@/features/search/types/search.types";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/features/search/hooks/useDebouncedValue";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { search } from "@/features/search/services/search.service";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { SearchResponseDto as SearchResponseWireDto } from "@/lib/api/generated/schemas/searchResponseDto";

export const SEARCH_MIN_QUERY_LENGTH = 2;

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

function buildHrefForKind(
kind: SearchResultKind,
item: { id: string; slug?: string | null },
): string {
switch (kind) {
case "quiz":
return `/quizzes/${item.slug ?? item.id}`;
case "user":
return `/profile/${item.id}`;
case "tournament":
return `/tournaments/${item.id}`;
case "achievement":
return `/achievements#${item.id}`;
case "ranking":
return `/leaderboard#${item.id}`;
case "tag":
return `/tags/${item.id}`;
case "category":

return `/categories/${item.id}`;
case "comment":
return `/quizzes/${item.id}#comments`;
case "social":
return `/profile/${item.id}`;
default:
return "/";
  }
}

type WireQuiz = {
quizId: string;
title: string;
slug: string;
};
type WireUser = {
userId: string;
username: string;
displayName?: string | null;
};
type WireTag = { tagId: string; name: string };
type WireComment = { commentId: string; quizId: string };
type WireCategory = {
categoryId: string;
name: string;
};

function adaptWireToFeature(
wire: SearchResponseWireDto,
): SearchResponseDto {
const groups: Partial<Record<SearchResultKind, SearchGroup<unknown>>> = {};

const quizzes = (wire.quizzes ?? []).map((q: WireQuiz) => ({
id: q.quizId,
quizId: q.quizId,
title: q.title,
slug: q.slug,
displayName: q.title,
subtitle: undefined,
href: buildHrefForKind("quiz", { id: q.quizId, slug: q.slug }),
visibility: "public" as const,
  }));
if (quizzes.length > 0) {
groups.quiz = {
kind: "quiz",
items: quizzes,
visibility: "public",
    };
  }

const users = (wire.users ?? []).map((u: WireUser) => ({
id: u.userId,
userId: u.userId,
username: u.username,
displayName: u.displayName ?? u.username,
subtitle: u.username !== (u.displayName ?? u.username) ? u.username : undefined,
href: buildHrefForKind("user", { id: u.userId }),
visibility: "public" as const,
  }));
if (users.length > 0) {
groups.user = {
kind: "user",
items: users,
visibility: "public",
    };
  }

const tags = (wire.tags ?? []).map((t: WireTag) => ({
id: t.tagId,
tagId: t.tagId,
name: t.name,
displayName: t.name,
subtitle: undefined,
href: buildHrefForKind("tag", { id: t.tagId }),
visibility: "public" as const,
  }));
if (tags.length > 0) {
groups.tag = {
kind: "tag",
items: tags,
visibility: "public",
    };
  }

const categories = (wire.categories ?? []).map((c: WireCategory) => ({
id: c.categoryId,
categoryId: c.categoryId,
name: c.name,
displayName: c.name,
subtitle: undefined,
href: buildHrefForKind("category", { id: c.categoryId }),
visibility: "public" as const,
  }));
if (categories.length > 0) {
groups.category = {
kind: "category",
items: categories,
visibility: "public",
    };
  }

const comments = (wire.comments ?? []).map((c: WireComment) => ({
id: c.commentId,
commentId: c.commentId,
quizId: c.quizId,
displayName: "Comment",
subtitle: undefined,
href: buildHrefForKind("comment", { id: c.quizId }),
visibility: "public" as const,
  }));
if (comments.length > 0) {
groups.comment = {
kind: "comment",
items: comments,
visibility: "public",
    };
  }

return {
query: wire.query,
groups,
  };
}

function mapApiErrorToSearchCode(
apiErr: ApiError,
trimmedQueryLength: number,
): SearchErrorCode {
const code = apiErr.code;
const status = apiErr.status;

if (code === "GLOBAL_RATE_LIMITED" || status === 429) {
return "SEARCH_RATE_LIMITED";
  }
if (code === "GLOBAL_UNAUTHENTICATED" || status === 401) {
return "UNAUTHORIZED";
  }
if (code === "GLOBAL_FORBIDDEN" || status === 403) {
return "FORBIDDEN";
  }
if (status === 400 || code === "GLOBAL_VALIDATION_FAILED") {
if (trimmedQueryLength < SEARCH_MIN_QUERY_LENGTH) {
return "SEARCH_QUERY_TOO_SHORT";
    }
return "SEARCH_INVALID_QUERY";
  }
if (status >= 500 || code === "GLOBAL_INTERNAL_ERROR") {
return status === 503 ? "SEARCH_BACKEND_UNAVAILABLE" : "GLOBAL_INTERNAL_ERROR";
  }
return "GLOBAL_INTERNAL_ERROR";
}

export function useSearch(
params: SearchQueryParams = DEFAULT_SEARCH_QUERY_PARAMS,
options: { debounceMs?: number } = {},
): UseSearchResult {
const flagValue = getFeatureFlagValue("search_live");
const isFlagPlaceholder = flagValue === "placeholder";

const debounceMs = options.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

const rawQuery = params.q ?? "";
const trimmedQuery = useMemo(() => rawQuery.trim(), [rawQuery]);
const { debouncedValue: debouncedQuery } = useDebouncedValue(trimmedQuery, debounceMs);

const clampedLimit = useMemo(() => {
if (typeof params.limit !== "number") return undefined;
return Math.min(Math.max(1, params.limit), SEARCH_MAX_LIMIT);
  }, [params.limit]);

return useSearchInner({
trimmedQuery,
debouncedQuery,
clampedLimit,
kinds: params.kinds,
isFlagPlaceholder,
  });
}

interface UseSearchInnerArgs {
trimmedQuery: string;
debouncedQuery: string;
clampedLimit: number | undefined;
kinds: SearchResultKind[] | undefined;
isFlagPlaceholder: boolean;
}

function useSearchInner(args: UseSearchInnerArgs): UseSearchResult {
const { trimmedQuery, debouncedQuery, clampedLimit, kinds, isFlagPlaceholder } =
args;

const epochRef = useRef(0);
const abortRef = useRef<AbortController | null>(null);

const swrKey = useMemo(
() =>
SEARCH_CACHE_KEYS.results({
q: debouncedQuery,
limit: clampedLimit,
kinds,
      }),
[debouncedQuery, clampedLimit, kinds],
  );

const [groups, setGroups] = useState<SearchResponseDto["groups"] | null>(
null,
  );
const [error, setError] = useState<ApiError | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(false);

const fetchForQuery = useCallback(
async (signal: AbortSignal): Promise<void> => {
const currentEpoch = epochRef.current;
try {
const wire = (await search(debouncedQuery, {
...(clampedLimit !== undefined ? { limit: clampedLimit } : {}),
        })) as unknown as SearchResponseWireDto;

if (signal.aborted || currentEpoch !== epochRef.current) {
return;
        }

const adapted = adaptWireToFeature(wire);
setGroups(adapted.groups);
setError(null);
      } catch (cause: unknown) {
if (signal.aborted || currentEpoch !== epochRef.current) {
return;
        }

if (isApiError(cause)) {
const apiErr = cause as ApiError;
const searchCode = mapApiErrorToSearchCode(
apiErr,
debouncedQuery.length,
          );
setError(
new ApiError({
...(apiErr as unknown as Record<string, unknown>),
code: searchCode,
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
setGroups(null);
        } else {

setError(
new ApiError({
status: 0,
code: "GLOBAL_INTERNAL_ERROR",
message:
cause instanceof Error
? cause.message
: "Unknown search error",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
setGroups(null);
        }
      }
    },
[debouncedQuery, clampedLimit],
  );

useEffect(() => {

if (isFlagPlaceholder) {
abortRef.current?.abort();
epochRef.current += 1;
setIsLoading(false);
setGroups(null);
setError(null);
return;
    }

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
  }, [debouncedQuery, fetchForQuery, isFlagPlaceholder]);

const state: SearchQueryState = useMemo(() => {
if (isFlagPlaceholder) return "idle";
if (error) return "error";
if (isLoading && groups !== null) return "stale";
if (isLoading) return "fetching";
if (debouncedQuery.length < SEARCH_MIN_QUERY_LENGTH) return "idle";
if (
groups !== null &&
Object.keys(groups).length === 0
    ) {
return "empty";
    }
if (groups !== null) return "success";
return "idle";
  }, [error, isLoading, groups, debouncedQuery, isFlagPlaceholder]);

const hasResults = useMemo(() => {
if (!groups) return false;
return Object.values(groups).some(
(g) => (g as SearchGroup<unknown>).items.length > 0,
    );
  }, [groups]);

const retry = useCallback(async () => {
if (isFlagPlaceholder) return;
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
  }, [fetchForQuery, isFlagPlaceholder]);

const cancel = useCallback(() => {
abortRef.current?.abort();
epochRef.current += 1;
setIsLoading(false);
  }, []);

const isStale = isLoading && groups !== null;

void swrKey;

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