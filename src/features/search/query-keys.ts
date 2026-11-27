import type { SearchQueryParams } from "@/features/search/types/search.types";

export function serializeSearchParams(params: SearchQueryParams): string {
  const parts: string[] = [];

  const trimmedQ = params.q.trim();
  if (trimmedQ.length > 0) {
    parts.push(`q=${trimmedQ.toLowerCase()}`);
  }
  if (typeof params.limit === "number") {
    parts.push(`limit=${params.limit}`);
  }
  if (Array.isArray(params.kinds) && params.kinds.length > 0) {
    const sortedKinds = [...params.kinds].sort();
    parts.push(`kinds=${sortedKinds.join(",")}`);
  }

  return parts.join("|");
}

export const SEARCH_KEYS = {
  all: ["search"] as const,
  resultsPrefix: () => ["search", "results"] as const,
  results: (params: SearchQueryParams) =>
    ["search", "results", serializeSearchParams(params)] as const,
  history: () => ["search", "history", "session"] as const,
} as const;
