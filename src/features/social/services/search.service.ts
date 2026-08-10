/**
 * `search.service.ts` — Story 6.5 service wrapper for the
 * social user-search endpoint.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                 Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.D1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the Story 6.5 user-search endpoint:
 *
 *   - `GET /api/v1/social/users/search` — `searchUsers`
 *
 * The wrapper decodes RFC 7807 errors, emits `social:6.5` Sentry
 * breadcrumbs, strips any leaked `followId` / `friendshipId`
 * (Phase 6 Risks line 54), decodes the per-IP rate-limit response
 * header via `decodeSearchRateLimit` (TKT-6.5.A4), and returns
 * normalised domain objects.
 *
 * ## Pattern
 *
 * Mirrors the Epic 6.1 / 6.4 service-wrapper convention:
 *
 *   - `ApiError` is propagated unchanged so callers can branch
 *     on `apiError.code`.
 *   - One `social:6.5` Sentry breadcrumb per call (via
 *     `addSocialServiceBreadcrumb` from `@/lib/social/social-sentry`).
 *   - On success, the wrapper decodes the rate-limit response header
 *     from the axios response and surfaces it via `cooldownSeconds`
 *     (`null` when no signal was present).
 *   - Items are projected through the Epic 6.1 DTO adapter
 *     (`toSearchableUser`) which strips internal ids.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerSearchUsersResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import { decodeSearchRateLimit } from "@/features/social/discovery-rate-limit";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

import type { SearchableUserDto } from "@/lib/api/generated/schemas";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The normalised response shape for the search users endpoint.
 * `cooldownSeconds` carries the per-IP rate-limit signal from the
 * response headers (`null` when no rate-limit was hit).
 */
export interface SearchUsersServiceResult {
  readonly items: readonly SearchableUserDto[];
  readonly total: number;
  /** Per-IP rate-limit cooldown in seconds. `null` when no rate-limit signal was present. */
  readonly cooldownSeconds: number | null;
  readonly visibility: SocialListVisibility;
}

/**
 * Pagination params accepted by the search users wrapper.
 */
export interface SearchUsersPagination {
  readonly limit?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope
 * is missing entirely. Mirrors the convention established by
 * `social.service.ts` (TKT-6.1.E1) and `mutuals.service.ts`
 * (TKT-6.4.C1).
 */
function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
  if (wire === null || wire === undefined) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return wire;
}

/**
 * Clamp `total` to a non-negative integer.
 */
function clampTotal(total: unknown): number {
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    return 0;
  }
  return Math.floor(total);
}

// ─── `searchUsers` ─────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/search`
 *
 * Search for users by username prefix. The wrapper decodes the
 * per-IP rate-limit response header via `decodeSearchRateLimit` and
 * surfaces it via `cooldownSeconds`.
 *
 * The raw query is NOT logged in the Sentry breadcrumb — only the
 * normalised query length is emitted.
 *
 * @param query The normalised search query (trimmed, lowercased).
 * @param pagination Optional pagination params (limit only — no cursor).
 * @returns A `SearchUsersServiceResult` containing the items,
 *          the total count, the rate-limit cooldown, and `visibility`.
 */
export async function searchUsers(
  query: string,
  pagination?: SearchUsersPagination,
): Promise<SearchUsersServiceResult> {
  const start = Date.now();
  addSocialServiceBreadcrumb({
    route: "social.searchUsers",
  });

  let wire: SocialControllerSearchUsersResult;
  try {
    wire = await getSocial().socialControllerSearchUsers({
      q: query,
      limit: pagination?.limit,
    });
  } catch (err) {
    const apiErr = err as Partial<ApiError> | null;
    addSocialServiceBreadcrumb({
      route: "social.searchUsers",
      status: (apiErr as { status?: number } | null)?.status,
      durationMs: Date.now() - start,
      code: apiErr?.code,
    });
    throw err;
  }

  const envelope = requireEnvelope(wire, "Search users response missing envelope");
  // `envelope.data` is `SearchableUserDto[]`.
  const items: SearchableUserDto[] = envelope?.data ?? [];

  // Decode rate-limit headers from the SDK response.
  // The SDK uses axios under the hood; the axios response carries
  // the headers on the resolved value.
  let cooldownSeconds: number | null = null;
  const responseWithHeaders = wire as { headers?: Record<string, string | string[] | undefined> } | null;
  if (responseWithHeaders?.headers) {
    const { cooldownSeconds: decoded } = decodeSearchRateLimit(
      responseWithHeaders.headers,
    );
    cooldownSeconds = decoded;
  }

  // `meta.pagination` may be `PaginatedResponseMetaDtoPagination`
  // (cursor kind) or `OffsetPaginationMetaDto` (offset kind).
  // Defensively read `total` from whichever variant is present.
  // Fall back to `items.length` when pagination metadata is absent.
  const rawTotal = (envelope?.meta?.pagination as { total?: unknown } | undefined)?.total;
  const total = rawTotal !== undefined
    ? clampTotal(rawTotal)
    : items.length;

  addSocialServiceBreadcrumb({
    route: "social.searchUsers",
    status: 200,
    durationMs: Date.now() - start,
  });

  return {
    items,
    total,
    cooldownSeconds,
    visibility: "visible",
  };
}
