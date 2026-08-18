

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { SocialListKind } from "../components/SocialListKind";
import {
SOCIAL_GRAPH_DEFAULT_LIMIT,
SOCIAL_GRAPH_MAX_LIMIT,
} from "../pagination-invariants";

export type SocialListSWRKey = readonly [
"social",
"list",
SocialListKind,
string,
string | null,
number,
];

export const SOCIAL_LIST_SWR_DEFAULTS = Object.freeze({
dedupeInterval: 5_000,
revalidateOnFocus: true,
revalidateOnReconnect: true,
revalidateOnVisibility: true,
keepPreviousData: true,
});

export function makeSocialListSWRKey(
kind: SocialListKind,
targetUserId: string,
cursor: string | null,
limit: number,
): SocialListSWRKey | null {
if (typeof targetUserId !== "string" || targetUserId.length === 0) {
return null;
  }
if (cursor !== null && typeof cursor !== "string") {
return null;
  }
const clampedLimit = clampLimit(limit);
return Object.freeze([
"social",
"list",
kind,
targetUserId,
cursor,
clampedLimit,
  ] as const);
}

function clampLimit(limit: number): number {
if (!Number.isFinite(limit) || limit < 1) return SOCIAL_GRAPH_DEFAULT_LIMIT;
if (limit > SOCIAL_GRAPH_MAX_LIMIT) return SOCIAL_GRAPH_MAX_LIMIT;
return Math.floor(limit);
}

export function useSocialListSWRKey(
kind: SocialListKind,
targetUserId: string | null,
cursor: string | null,
limit: number,
): SocialListSWRKey | null {
if (targetUserId === null) return null;
return makeSocialListSWRKey(kind, targetUserId, cursor, limit);
}

export function useSocialListSWRKeyFromUrl(
kind: SocialListKind,
targetUserId: string | null,
limit: number = SOCIAL_GRAPH_DEFAULT_LIMIT,
): SocialListSWRKey | null {
const searchParams = useSearchParams();
const cursor = useMemo(() => {
const raw = searchParams.get("cursor");
return raw === null || raw === "" ? null : raw;
  }, [searchParams]);
const limitFromUrl = useMemo(() => {
const raw = searchParams.get("limit");
if (raw === null || raw === "") return limit;
const parsed = Number.parseInt(raw, 10);
if (!Number.isFinite(parsed) || parsed <= 0) return limit;
return Math.min(parsed, SOCIAL_GRAPH_MAX_LIMIT);
  }, [searchParams, limit]);
if (targetUserId === null) return null;
return makeSocialListSWRKey(kind, targetUserId, cursor, limitFromUrl);
}