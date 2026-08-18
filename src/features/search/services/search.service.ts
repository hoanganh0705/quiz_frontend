

import * as Sentry from "@sentry/nextjs";

import { getSearch } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
SearchControllerGetSearchResultsParams,
} from "@/lib/api/generated/schemas";

import type {
SearchControllerGetSearchResultsResult,
} from "@/lib/api/generated/search/search";

export async function search(
query: string,
options: {
limit?: number;
  } = {},
): Promise<SearchControllerGetSearchResultsResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `search.search(${JSON.stringify(query)})`,
  });

const params: SearchControllerGetSearchResultsParams = {
q: query,
...(options.limit !== undefined ? { limit: options.limit } : {}),
  };

const data = await getSearch().searchControllerGetSearchResults(params);

if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Search response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }

return data.data;
}
