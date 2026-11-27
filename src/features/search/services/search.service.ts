import * as Sentry from "@sentry/nextjs";

import { getSearch, unwrapEnvelope } from "@/lib/api";

import type { SearchControllerGetSearchResultsParams } from "@/lib/api/generated/schemas";
import type { SearchControllerGetSearchResultsResult } from "@/lib/api/generated/search/search";

export async function search(
  query: string,
  options: {
    limit?: number;
  } = {},
): Promise<SearchControllerGetSearchResultsResult["data"]> {
  Sentry.addBreadcrumb({
    category: "search:service",
    message: `search.search(${JSON.stringify(query)})`,
  });

  const params: SearchControllerGetSearchResultsParams = {
    q: query,
    ...(options.limit !== undefined ? { limit: options.limit } : {}),
  };

  const response = await getSearch().searchControllerGetSearchResults(params);
  return unwrapEnvelope(response, "Search response missing data envelope");
}
