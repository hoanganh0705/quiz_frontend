

import {
RELATIONSHIP_VALUES,
type Relationship,
type RelationshipStatusDto,
type SocialActivityItemDto,
type SocialBlockedUserDto,
type SocialCountsDto,
type SocialFeedItemDto,
type SocialFeedItemPayload,
type SocialFeedItemType,
type SocialFriendRequestDto,
type SocialMutualDto,
type SocialPage,
type SocialUserSummaryDto,
} from "./types/relationship";

interface RelationshipStatusWireDto {
readonly userId?: string;
readonly since?: string;
readonly isFriend?: boolean;
readonly hasPendingRequest?: boolean;
readonly isFollower?: boolean;
readonly isFollowing?: boolean;
readonly isBlocked?: boolean;
readonly isBlockedBy?: boolean;
readonly followId?: unknown;
readonly friendshipId?: unknown;
}

export function stripRelationshipInternalIds(
input: unknown,
): RelationshipStatusDto {
const wire = (input ?? {}) as RelationshipStatusWireDto;
const userId = typeof wire.userId === "string" ? wire.userId : "";
const relationship = toRelationship(wire);
const since = typeof wire.since === "string" ? wire.since : new Date(0).toISOString();

void wire.followId;
void wire.friendshipId;
return Object.freeze({
userId,
relationship,
since,
followId: undefined as never,
friendshipId: undefined as never,
  });
}

function isKnownRelationship(value: string): value is Relationship {
return (RELATIONSHIP_VALUES as readonly string[]).includes(value);
}

export function toRelationship(input: unknown): Relationship {
if (typeof input === "string") {
if (isKnownRelationship(input)) return input;
return "none";
  }

if (input && typeof input === "object") {
const wire = input as Partial<RelationshipStatusWireDto>;
if (wire.isFriend === true) return "friend";
if (wire.isBlocked === true) return "blocked";
if (wire.isBlockedBy === true) return "blocked_by";
if (wire.hasPendingRequest === true) return "incoming_request";
if (wire.isFollowing === true) return "following";
if (wire.isFollower === true) return "follower";
return "none";
  }

return "none";
}

const EMPTY_OFFSET_PAGE = Object.freeze({
items: [] as readonly unknown[],
paginationKind: "offset" as const,
total: 0,
offset: 0,
limit: 0,
});

export function normalizeSocialOffsetPage<T>(
input:
| {
data: readonly T[];
meta: {
pagination: {
kind: "offset";
total: number;
offset: number;
limit: number;
          };
        };
      }
    | null
    | undefined,
): SocialPage<T> {
if (input === null || input === undefined) {
return EMPTY_OFFSET_PAGE as SocialPage<T>;
  }
const out = {
items: input.data,
paginationKind: "offset" as const,
total: input.meta.pagination.total,
offset: input.meta.pagination.offset,
limit: input.meta.pagination.limit,
  };
return Object.freeze(out);
}

export function normalizeSocialCursorPage<T>(
input:
| {
data: readonly T[];
meta: {
pagination: {
kind: "cursor";
nextCursor: string | null;
limit: number;
          };
        };
      }
    | null
    | undefined,
): SocialPage<T> {
if (input === null || input === undefined) {
return EMPTY_OFFSET_PAGE as SocialPage<T>;
  }
const out = {
items: input.data,
paginationKind: "cursor" as const,
nextCursor: input.meta.pagination.nextCursor,
limit: input.meta.pagination.limit,
  };
return Object.freeze(out);
}

export function normalizeSocialPage<T>(input: unknown): SocialPage<T> {
if (input === null || input === undefined) {
return EMPTY_OFFSET_PAGE as SocialPage<T>;
  }
if (typeof input !== "object") {
return EMPTY_OFFSET_PAGE as SocialPage<T>;
  }
const envelope = input as {
data?: unknown;
meta?: { pagination?: { kind?: string } };
  };
const data = Array.isArray(envelope.data) ? (envelope.data as readonly T[]) : [];
const kind = envelope.meta?.pagination?.kind;
if (kind === "cursor") {
const cursor = (envelope.meta?.pagination as { nextCursor?: unknown } | undefined)?.nextCursor;
return normalizeSocialCursorPage<T>({
data,
meta: {
pagination: {
kind: "cursor",
nextCursor: typeof cursor === "string" ? cursor : null,
limit: data.length,
        },
      },
    });
  }

const total = (envelope.meta?.pagination as { total?: unknown } | undefined)?.total;
const offset = (envelope.meta?.pagination as { offset?: unknown } | undefined)?.offset;
const limit = (envelope.meta?.pagination as { limit?: unknown } | undefined)?.limit;
return normalizeSocialOffsetPage<T>({
data,
meta: {
pagination: {
kind: "offset",
total: typeof total === "number" ? total : data.length,
offset: typeof offset === "number" ? offset : 0,
limit: typeof limit === "number" ? limit : data.length,
      },
    },
  });
}

const FEED_TYPE_VALUES: ReadonlySet<SocialFeedItemType> = new Set<SocialFeedItemType>([
"badge_earned",
"badge_revoked",
"rank_milestone",
"peak_rank_achieved",
"tournament_joined",
"tournament_completed",
"tournament_won",
"comment_created",
"quiz_completed",
"quiz_milestone",
"instance_created",
"instance_joined",
"instance_completed",
]);

function isFeedItemType(value: string): value is SocialFeedItemType {
return FEED_TYPE_VALUES.has(value as SocialFeedItemType);
}

export function normalizeSocialFeedItemPayload(
input: unknown,
): SocialFeedItemPayload | null {
if (!input || typeof input !== "object") return null;
const raw = input as { type?: unknown };
if (typeof raw.type !== "string") return null;
if (!isFeedItemType(raw.type)) return null;

return raw as unknown as SocialFeedItemPayload;
}

function extractNullableString(input: unknown): string | null {
if (input === null || input === undefined) return null;
if (typeof input === "string") return input;
return null;
}

interface UserRowWireDto {
readonly userId?: string;
readonly requesterId?: string;
readonly username?: string;
readonly userName?: string;
readonly displayName?: unknown;
readonly avatarUrl?: unknown;
readonly createdAt?: string;
readonly isPrivate?: boolean;
}

export function toUserSummary(input: unknown): SocialUserSummaryDto {
const wire = (input ?? {}) as UserRowWireDto;
const userId =
typeof wire.userId === "string"
? wire.userId
: typeof wire.requesterId === "string"
? wire.requesterId
: "";
const userName =
typeof wire.userName === "string"
? wire.userName
: typeof wire.username === "string"
? wire.username
: "";
const displayName = extractNullableString(wire.displayName);
const avatarUrl = extractNullableString(wire.avatarUrl);
const createdAt = typeof wire.createdAt === "string" ? wire.createdAt : new Date(0).toISOString();

return Object.freeze({
id: userId,
userId,
userName,
displayName,
avatarUrl,
isPrivate: wire.isPrivate === true,
createdAt,
  });
}

export function toSocialUserSummaryFromFollowRow(
input: unknown,
): SocialUserSummaryDto {
return toUserSummary(input);
}

export function toSocialUserSummaryFromFriendRow(
input: unknown,
): SocialUserSummaryDto {
const wire = (input ?? {}) as UserRowWireDto & {
readonly friendshipId?: unknown;
readonly friendSince?: unknown;
  };

void wire.friendshipId;
void wire.friendSince;
return toUserSummary(input);
}

export function toFriendRequest(input: unknown): SocialFriendRequestDto {
const wire = (input ?? {}) as {
readonly friendshipId?: string;
readonly requesterId?: string;
readonly addresseeId?: string;
readonly requesterUsername?: string;
readonly createdAt?: string;
readonly requesterDisplayName?: unknown;
readonly requesterAvatarUrl?: unknown;
  };
const friendshipId = wire.friendshipId ?? "";
const requesterId = wire.requesterId ?? "";
const addresseeId = wire.addresseeId ?? "";
const requester = toUserSummary({
userId: wire.requesterId,
userName: wire.requesterUsername,
displayName: wire.requesterDisplayName,
avatarUrl: wire.requesterAvatarUrl,
  });
const createdAt =
typeof wire.createdAt === "string" ? wire.createdAt : new Date(0).toISOString();

return Object.freeze({
id: friendshipId,
requesterId,
addresseeId,
requester,
createdAt,
  });
}

export function toBlockedUser(input: unknown): SocialBlockedUserDto {
const wire = (input ?? {}) as {
readonly blockedId?: string;
readonly userId?: string;
readonly createdAt?: string;
readonly since?: string;
  };
const id = wire.blockedId ?? wire.userId ?? "";
const user = toUserSummary({ userId: wire.blockedId ?? wire.userId });
const since = wire.since ?? wire.createdAt ?? new Date(0).toISOString();
return Object.freeze({
id,
userId: wire.blockedId ?? wire.userId ?? "",
user,
since,
  });
}

export function toSocialCounts(input: unknown): SocialCountsDto {
const wire = (input ?? {}) as {
readonly friends?: number;
readonly followers?: number;
readonly following?: number;
readonly friendCount?: number;
readonly followerCount?: number;
readonly followingCount?: number;
readonly blocked?: number;
readonly pendingIncomingCount?: number;
readonly pendingOutgoingCount?: number;
  };

const friends = wire.friends ?? wire.friendCount ?? 0;
const followers = wire.followers ?? wire.followerCount ?? 0;
const following = wire.following ?? wire.followingCount ?? 0;
const blocked = wire.blocked ?? 0;
const hasPendingIncoming = typeof wire.pendingIncomingCount === "number";
const hasPendingOutgoing = typeof wire.pendingOutgoingCount === "number";

return Object.freeze({
followers,
following,
friends,
blocked,
pendingIncomingCount: hasPendingIncoming ? wire.pendingIncomingCount : undefined,
pendingOutgoingCount: hasPendingOutgoing ? wire.pendingOutgoingCount : undefined,
  });
}

interface MutualItemWireDto {
readonly userId?: string;
readonly username?: string;
readonly displayName?: unknown;
readonly avatarUrl?: unknown;
readonly mutualFriends?: number;
readonly mutualFollowers?: number;
}

export function toMutual(input: unknown): SocialMutualDto {
const wire = (input ?? {}) as MutualItemWireDto;
const user = toUserSummary({
userId: wire.userId,
userName: wire.username,
displayName: wire.displayName,
avatarUrl: wire.avatarUrl,
  });
const mutualFriendsCount = typeof wire.mutualFriends === "number" ? wire.mutualFriends : 0;
const mutualFollowersCount =
typeof wire.mutualFollowers === "number" ? wire.mutualFollowers : 0;
return Object.freeze({
id: user.userId,
user,
mutualFriendsCount,
mutualFollowersCount,
  });
}

interface ActivityItemWireDto {
readonly id?: string;
readonly type?: string;
readonly occurredAt?: string;
readonly at?: string;
readonly payload?: unknown;
}

export function toActivityItem(
input: unknown,
): SocialActivityItemDto | null {
const wire = (input ?? {}) as ActivityItemWireDto;
const id = typeof wire.id === "string" ? wire.id : "";
const type =
typeof wire.type === "string" && isFeedItemType(wire.type)
? wire.type
: null;
if (type === null) return null;
const at =
typeof wire.occurredAt === "string"
? wire.occurredAt
: typeof wire.at === "string"
? wire.at
: new Date(0).toISOString();
const payload = normalizeSocialFeedItemPayload(wire.payload);
if (payload === null) return null;

const actor = toUserSummary({});
return Object.freeze({
id,
type,
at,
actorUser: actor,
payload,
  });
}

interface FeedItemWireDto {
readonly id?: string;
readonly type?: string;
readonly occurredAt?: string;
readonly at?: string;
readonly user?: {
readonly userId?: string;
readonly username?: string;
  };
readonly payload?: unknown;
}

export function toFeedItem(
input: unknown,
): SocialFeedItemDto | null {
const wire = (input ?? {}) as FeedItemWireDto;
const id = typeof wire.id === "string" ? wire.id : "";
const type =
typeof wire.type === "string" && isFeedItemType(wire.type)
? wire.type
: null;
if (type === null) return null;
const at =
typeof wire.occurredAt === "string"
? wire.occurredAt
: typeof wire.at === "string"
? wire.at
: new Date(0).toISOString();
const payload = normalizeSocialFeedItemPayload(wire.payload);
if (payload === null) return null;
const wireUser = wire.user ?? {};
const actorUser = toUserSummary({
userId: wireUser.userId,
userName: wireUser.username,
  });
return Object.freeze({
id,
type,
at,
actorUser,
payload,
  });
}