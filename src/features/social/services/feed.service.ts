

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetFeedResult,
} from "@/lib/api/generated/social/social";

import { addSocialFeedBreadcrumb } from "@/lib/social/social-feed-sentry";

import { toFeedItem } from "@/features/social/dto-adapters";
import type { SocialFeedItemDto } from "@/features/social/types";
import type {
SocialListVisibility,
} from "@/features/social/social-list-visibility";

export interface FeedServiceResult {
readonly items: readonly SocialFeedItemDto[];

readonly nextCursor: string | null;

readonly hasMore: boolean;
readonly visibility: SocialListVisibility;
}

export interface FeedServicePagination {
readonly cursor?: string;
readonly limit?: number;
}

function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
if (wire === null || wire === undefined) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message,
    });
  }
return wire;
}

function projectFeedPage(envelope: SocialControllerGetFeedResult): {
items: SocialFeedItemDto[];
nextCursor: string | null;
hasMore: boolean;
} {
const rows = envelope?.data ?? [];
const items: SocialFeedItemDto[] = [];
for (const row of rows) {
const projected = toFeedItem(row);
if (projected !== null) items.push(projected);
  }

const pagination = envelope?.meta?.pagination;
const nextCursor =
pagination && typeof pagination.nextCursor === "string"
? pagination.nextCursor
: null;
const hasMore = pagination?.hasNextPage === true;
return { items, nextCursor, hasMore };
}

export async function getFeed(
pagination?: FeedServicePagination,
): Promise<FeedServiceResult> {
const startedAt = Date.now();

let wire: SocialControllerGetFeedResult;
try {
wire = await getSocial().socialControllerGetFeed(pagination);
  } catch (err) {
const apiErr = err as Partial<ApiError> | null;
addSocialFeedBreadcrumb({
route: "social.getFeed",
durationMs: Date.now() - startedAt,
...(apiErr?.code !== undefined ? { code: apiErr.code } : {}),
    });
throw err;
  }

const envelope = requireEnvelope(wire, "Get feed response missing envelope");
const projected = projectFeedPage(envelope);
addSocialFeedBreadcrumb({
route: "social.getFeed",
durationMs: Date.now() - startedAt,
hasMore: projected.hasMore,
total: projected.items.length,
  });
return {
items: projected.items,
nextCursor: projected.nextCursor,
hasMore: projected.hasMore,
visibility: "visible",
  };
}
