

import type { SocialPaginationKind } from "@/features/social/types";

export const SOCIAL_GRAPH_PAGINATION_KIND = "cursor" as const satisfies SocialPaginationKind;

export const SOCIAL_GRAPH_DEFAULT_LIMIT = 20;

export const SOCIAL_GRAPH_MAX_LIMIT = 100;

export const FORBIDDEN_SOCIAL_STORAGE_KEYS = [
"followId",
"friendshipId",
"offset",
] as const;

export const SOCIAL_GRAPH_URL_KEYS = ["cursor", "limit"] as const;

export type SocialGraphUrlKey = (typeof SOCIAL_GRAPH_URL_KEYS)[number];

export const SOCIAL_GRAPH_PAGINATION_INVARIANTS = Object.freeze({
paginationKind: SOCIAL_GRAPH_PAGINATION_KIND,
defaultLimit: SOCIAL_GRAPH_DEFAULT_LIMIT,
maxLimit: SOCIAL_GRAPH_MAX_LIMIT,
forbiddenStorageKeys: FORBIDDEN_SOCIAL_STORAGE_KEYS,
urlKeys: SOCIAL_GRAPH_URL_KEYS,
});
