/**
 * `search.service.ts` — Unified search service.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F6.
 *
 * ## Pattern
 *
 * Thin SDK pass-through with Sentry breadcrumbs and `data` envelope
 * unwrapping. Follows the same discipline as `tournaments.service.ts`:
 *
 *   - Pure forwarder — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR`.
 */

import * as Sentry from "@sentry/nextjs";

import { getSearch } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
  SearchControllerGetSearchResultsParams,
} from "@/lib/api/generated/schemas";

import type {
  SearchControllerGetSearchResultsResult,
} from "@/lib/api/generated/search/search";

// ─── Search ───────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/search`
 *
 * Performs a unified search across quizzes, users, and tags.
 *
 * @param query    - The search query string (minLength: 2).
 * @param options.limit  - Maximum results per section (default: 20, max: 20).
 */
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
