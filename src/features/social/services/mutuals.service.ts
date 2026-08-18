

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetMutualFollowersResult,
SocialControllerGetMutualFriendsResult,
} from "@/lib/api/generated/social/social";

import {
addSocialMutualBreadcrumb,
type MutualSurface,
} from "@/lib/social/social-mutuals-sentry";

import { MUTUAL_TOTAL_HARD_CAP } from "@/features/social/mutual-count-invariants";
import { toMutual } from "@/features/social/dto-adapters";
import type { SocialMutualDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

export interface MutualServiceResult {
readonly items: readonly SocialMutualDto[];
readonly total: number;
readonly visibility: SocialListVisibility;
}

export interface MutualServicePagination {
readonly cursor?: string;
readonly limit?: number;
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

function clampTotal(total: number): number {
if (!Number.isFinite(total) || total < 0) return 0;
if (total > MUTUAL_TOTAL_HARD_CAP) return MUTUAL_TOTAL_HARD_CAP;
return Math.floor(total);
}

function projectMutualPage(
envelope:
| SocialControllerGetMutualFriendsResult
    | SocialControllerGetMutualFollowersResult,
): { items: SocialMutualDto[]; total: number } {
const rows = envelope?.data ?? [];
const items: SocialMutualDto[] = rows.map((row) => toMutual(row));

const total = clampTotal(items.length);
return { items, total };
}

export async function getMutualFriends(
targetUserId: string,
pagination?: MutualServicePagination,
): Promise<MutualServiceResult> {
addSocialMutualBreadcrumb({
route: "social.getMutualFriends",
targetUserId,
surface: "mutuals-friends",
  });
const wire: SocialControllerGetMutualFriendsResult =
await getSocial().socialControllerGetMutualFriends(targetUserId, pagination);
const envelope = requireEnvelope(
wire,
"Get mutual friends response missing envelope",
  );
const projected = projectMutualPage(envelope);
addSocialMutualBreadcrumb({
route: "social.getMutualFriends",
targetUserId,
surface: "mutuals-friends",
total: projected.total,
  });
return {
items: projected.items,
total: projected.total,
visibility: "visible",
  };
}

export async function getMutualFollowers(
targetUserId: string,
pagination?: MutualServicePagination,
): Promise<MutualServiceResult> {
addSocialMutualBreadcrumb({
route: "social.getMutualFollowers",
targetUserId,
surface: "mutuals-followers",
  });
const wire: SocialControllerGetMutualFollowersResult =
await getSocial().socialControllerGetMutualFollowers(
targetUserId,
pagination,
    );
const envelope = requireEnvelope(
wire,
"Get mutual followers response missing envelope",
  );
const projected = projectMutualPage(envelope);
addSocialMutualBreadcrumb({
route: "social.getMutualFollowers",
targetUserId,
surface: "mutuals-followers",
total: projected.total,
  });
return {
items: projected.items,
total: projected.total,
visibility: "visible",
  };
}

export const __INTERNAL_PROJECTION__ = Object.freeze({
surface: {
friends: "mutuals-friends" as MutualSurface,
followers: "mutuals-followers" as MutualSurface,
  },
});
