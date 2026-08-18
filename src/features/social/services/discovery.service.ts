

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetSuggestionsResult,
SocialControllerGetSearchSuggestionsResult,
SocialControllerGetTrendingUsersResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import {
isSocialSearchSuggestionKind,
DEFENSIVE_FALLBACK_TESTID,
type SocialSearchSuggestionKind,
} from "@/features/social/discovery-discriminator";

import type { SocialSuggestionItemDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

import type {
TrendingUserResponseDto,
} from "@/lib/api/generated/schemas";

export interface SuggestionsServiceResult {
readonly items: readonly SocialSuggestionItemDto[];
readonly total: number;
readonly visibility: SocialListVisibility;
}

export interface SearchSuggestionsServiceResult {
readonly groups: Readonly<
Partial<Record<SocialSearchSuggestionKind, readonly string[]>>
  >;
}

export interface TrendingUsersServiceResult {
readonly items: readonly TrendingUserResponseDto[];
readonly total: number;
readonly visibility: SocialListVisibility;
}

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

function clampTotal(total: unknown): number {
if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
return 0;
  }
return Math.floor(total);
}

export async function getSuggestions(
pagination?: { limit?: number },
): Promise<SuggestionsServiceResult> {
const start = Date.now();
addSocialServiceBreadcrumb({
route: "social.getSuggestions",
  });
let wire: SocialControllerGetSuggestionsResult;
try {
wire = await getSocial().socialControllerGetSuggestions({
limit: pagination?.limit,
    });
  } catch (err) {
const apiErr = err as Partial<ApiError> | null;
addSocialServiceBreadcrumb({
route: "social.getSuggestions",
status: (apiErr as { status?: number } | null)?.status,
durationMs: Date.now() - start,
code: apiErr?.code,
    });
throw err;
  }
const envelope = requireEnvelope(wire, "Get suggestions response missing envelope");

const rows = (envelope?.data ?? []) as unknown as SocialSuggestionItemDto[];

const rawTotal = (envelope?.meta?.pagination as { total?: unknown } | undefined)?.total;
const total = typeof rawTotal === "number" && Number.isFinite(rawTotal)
? Math.floor(rawTotal)
: rows.length;
addSocialServiceBreadcrumb({
route: "social.getSuggestions",
status: 200,
durationMs: Date.now() - start,
  });
return {
items: rows,
total,
visibility: "visible",
  };
}

export async function getSearchSuggestions(
query: string,
limit?: number,
): Promise<SearchSuggestionsServiceResult> {
const start = Date.now();
addSocialServiceBreadcrumb({
route: "social.getSearchSuggestions",
  });
let wire: SocialControllerGetSearchSuggestionsResult;
try {
wire = await getSocial().socialControllerGetSearchSuggestions({
q: query,
limit,
    });
  } catch (err) {
const apiErr = err as Partial<ApiError> | null;
addSocialServiceBreadcrumb({
route: "social.getSearchSuggestions",
status: (apiErr as { status?: number } | null)?.status,
durationMs: Date.now() - start,
code: apiErr?.code,
    });
throw err;
  }
const envelope = requireEnvelope(wire, "Get search suggestions response missing envelope");
const rawItems: string[] = envelope?.data ?? [];

const groupMap: Record<string, string[]> = {};
for (const item of rawItems) {
if (isSocialSearchSuggestionKind(item) && item !== "unsupported") {
const bucket = groupMap[item] ?? [];
bucket.push(item);
groupMap[item] = bucket;
    } else {
const bucket = groupMap["unsupported"] ?? [];
bucket.push(item);
groupMap["unsupported"] = bucket;
    }
  }

const groups: SearchSuggestionsServiceResult["groups"] = Object.freeze(
Object.fromEntries(
Object.entries(groupMap).map(([k, v]) => [k, Object.freeze(v)]),
    ),
  );

addSocialServiceBreadcrumb({
route: "social.getSearchSuggestions",
status: 200,
durationMs: Date.now() - start,
  });
return { groups };
}

export async function getTrendingUsers(
pagination?: { limit?: number },
): Promise<TrendingUsersServiceResult> {
const start = Date.now();
addSocialServiceBreadcrumb({
route: "social.getTrendingUsers",
  });
let wire: SocialControllerGetTrendingUsersResult;
try {
wire = await getSocial().socialControllerGetTrendingUsers({
limit: pagination?.limit,
    });
  } catch (err) {
const apiErr = err as Partial<ApiError> | null;
addSocialServiceBreadcrumb({
route: "social.getTrendingUsers",
status: (apiErr as { status?: number } | null)?.status,
durationMs: Date.now() - start,
code: apiErr?.code,
    });
throw err;
  }
const envelope = requireEnvelope(wire, "Get trending users response missing envelope");
const rows: TrendingUserResponseDto[] = envelope?.data ?? [];
const total = rows.length;
addSocialServiceBreadcrumb({
route: "social.getTrendingUsers",
status: 200,
durationMs: Date.now() - start,
  });
return {
items: rows,
total,
visibility: "visible",
  };
}
