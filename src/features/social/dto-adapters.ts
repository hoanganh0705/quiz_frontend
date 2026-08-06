/**
 * `dto-adapters.ts` — Normalisation layer between the social SDK DTOs
 * and the frontend projections declared in `./types/relationship.ts`.
 *
 * Source epic:   Epic 6.1.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.C2.
 *
 * ## Purpose
 *
 * Every social read hook and mutation hook in Phase 6 must call the
 * service layer and then immediately pass the wire response through one
 * of the adapters declared here. The adapters own three
 * cross-cutting concerns:
 *
 *   1. **Internal-id leakage defence.** The backend may emit `followId`
 *      or `friendshipId` values inside a `RelationshipStatusDto`. The
 *      master plan Phase 6 Risks line 54 explicitly calls out this
 *      leakage. `stripRelationshipInternalIds` is the single function in
 *      the codebase that is allowed to read those fields — it copies
 *      the input and drops them before the rest of the application
 *      sees the response. The projection's `followId` / `friendshipId`
 *      fields are typed `never` so the type system enforces the rule.
 *
 *   2. **Defensive relationship normalisation.** `toRelationship` maps
 *      a raw backend status string to the `Relationship` enum. The
 *      backend may add new statuses without a frontend release; the
 *      mapper falls back to `'none'` for any unknown value. The
 *      `Relationship` union therefore stays stable across releases and
 *      exhaustive `switch` blocks compile.
 *
 *   3. **Pagination normalisation.** `normalizeSocialPage`,
 *      `normalizeSocialOffsetPage`, and `normalizeSocialCursorPage`
 *      collapse the SDK's paginated envelope into the discriminated
 *      `SocialPage<T>` shape. Both offset and cursor pagination kinds
 *      are accepted; the `paginationKind` discriminator is the single
 *      branching point downstream consumers care about. A future
 *      migration to a uniform cursor strategy is therefore a one-line
 *      change in the service layer.
 *
 * ## What is NOT in this file
 *
 *   - The mutation-state derivations (`'idle' | 'pending' | ...`) —
 *     those live with the mutation hooks.
 *   - The relationship permissions — `useSocialPermissions`
 *     (TKT-6.1.D2) derives them from `Relationship` + the auth state,
 *     not from the wire shape.
 */

import {
  RELATIONSHIP_VALUES,
  type Relationship,
  type RelationshipStatusDto,
  type SocialActivityItemDto,
  type SocialBlockedUserDto,
  type SocialCountsDto,
  type SocialFeedItemPayload,
  type SocialFeedItemType,
  type SocialFriendRequestDto,
  type SocialMutualDto,
  type SocialPage,
  type SocialUserSummaryDto,
} from "./types/relationship";

// ─── Internal-id leakage defence ────────────────────────────────────────

/**
 * Wire shape for the relationship endpoint. The SDK currently emits
 * only boolean flags, but the master plan Phase 6 Risks line 54 calls
 * out the possibility that `followId` and `friendshipId` may be
 * present in the response. This wire type therefore models the
 * "defensive maximum" — the adapter works regardless of whether those
 * fields are present or absent today.
 */
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

/**
 * Return a copy of the wire DTO with `followId` / `friendshipId`
 * removed. This is the single point in the codebase that is allowed to
 * read those fields; the rest of the application only sees the
 * projection `RelationshipStatusDto` (whose `followId` /
 * `friendshipId` fields are typed `never`).
 *
 * The function also runs the boolean flags through `toRelationship`
 * so consumers receive the normalised projection shape.
 *
 * @param input Raw backend payload (may include leaked internal ids).
 * @returns A frozen projection safe to persist and route by.
 */
export function stripRelationshipInternalIds(
  input: unknown,
): RelationshipStatusDto {
  const wire = (input ?? {}) as RelationshipStatusWireDto;
  const userId = typeof wire.userId === "string" ? wire.userId : "";
  const relationship = toRelationship(wire);
  const since = typeof wire.since === "string" ? wire.since : new Date(0).toISOString();
  // Discard any internal-id values explicitly; the projection's
  // `never` typing prevents accidental reads downstream.
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

// ─── Defensive relationship normalisation ────────────────────────────────

/**
 * Type guard for `Relationship`. Used by `toRelationship` to narrow the
 * raw backend string.
 */
function isKnownRelationship(value: string): value is Relationship {
  return (RELATIONSHIP_VALUES as readonly string[]).includes(value);
}

/**
 * Map a raw backend status string (or a wire DTO carrying the boolean
 * flags) to the canonical `Relationship` enum value.
 *
 * The wire DTO path follows the master plan's documented precedence:
 *
 *   1. `isFriend === true` → `'friend'`.
 *   2. `isBlocked === true` → `'blocked'`.
 *   3. `isBlockedBy === true` → `'blocked_by'`.
 *   4. `hasPendingRequest === true` → `'incoming_request'` (the backend
 *      treats this as "there is a request between the two users";
 *      the frontend further refines with the addressee/requester
 *      direction in the dedicated friend-request endpoints).
 *   5. `isFollowing === true` → `'following'`.
 *   6. `isFollower === true` → `'follower'`.
 *   7. Anything else → `'none'`.
 *
 * The string form (for unknown backend statuses) returns `'none'` for
 * any value outside `RELATIONSHIP_VALUES` so the union is exhaustive.
 */
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

// ─── Pagination normalisation ────────────────────────────────────────────

/**
 * Empty offset page returned for `null` / `undefined` inputs. The
 * discriminated-union return type guarantees `paginationKind: 'offset'`
 * so the consumer's switch narrows correctly.
 */
const EMPTY_OFFSET_PAGE = Object.freeze({
  items: [] as readonly unknown[],
  paginationKind: "offset" as const,
  total: 0,
  offset: 0,
  limit: 0,
});

/**
 * Normalise an offset-paginated envelope into a `SocialPage<T>` shape.
 *
 * Accepts the SDK's wrapped `{ data, meta: { pagination: { kind, total,
 * offset, limit } } }` shape or `null` / `undefined` (returns the empty
 * page). The output is `Object.freeze`-d so consumers can treat it as
 * immutable.
 */
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

/**
 * Normalise a cursor-paginated envelope into a `SocialPage<T>` shape.
 */
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

/**
 * Discriminating normaliser — accepts either an offset or a cursor
 * envelope (or `null` / `undefined`) and returns the canonical
 * `SocialPage<T>` discriminated union.
 *
 * The function inspects `meta.pagination.kind` to dispatch:
 *
 *   - `'offset'` → `normalizeSocialOffsetPage`.
 *   - `'cursor'` → `normalizeSocialCursorPage`.
 *   - Anything else (including `null` / `undefined` / unknown kind) →
 *     the empty offset page.
 */
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
  // Default — offset (the dominant Phase 6 case per master plan §6.2).
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

// ─── Feed payload discriminated-union narrowing ──────────────────────────

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

/**
 * Narrow an unknown payload into the `SocialFeedItemPayload`
 * discriminated union.
 *
 * Returns `null` when the payload's `type` is unknown — this signals
 * to consumers that the row should be dropped (or rendered with a
 * generic placeholder while a follow-up release adds a new variant).
 *
 * The function reads only primitive identifiers from the input; it
 * does not assume any specific shape beyond the `type` discriminator
 * plus the documented per-variant id / slug fields.
 */
export function normalizeSocialFeedItemPayload(
  input: unknown,
): SocialFeedItemPayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { type?: unknown };
  if (typeof raw.type !== "string") return null;
  if (!isFeedItemType(raw.type)) return null;
  // The SDK emits `SocialFeedItemDtoPayload = { [key: string]: unknown }`,
  // so the per-variant narrow is intentionally permissive — the
  // discriminator has been validated above.
  return raw as unknown as SocialFeedItemPayload;
}

// ─── User-summary projections (follower / following / friend / blocked) ─

/**
 * Extract a primitive string from a nullable polymorphic field. The
 * SDK encodes nullable scalars as `{ [key: string]: unknown } | null`
 * for forward-compatibility with future structured payloads (e.g. an
 * avatar URL might become `{ url, width, height }`). Today's wire
 * values are plain strings, so we narrow with `typeof string`.
 */
function extractNullableString(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string") return input;
  return null;
}

/**
 * The defensive maximum of the SDK follower / following / friend row
 * shapes. The list endpoint returns a *flat* row (no nested user
 * object); the projection must therefore be assembled from the
 * primitive fields. Fields that are not present in the wire payload
 * default to safe placeholders so the rest of the UI can render a
 * minimal-but-correct card.
 */
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

/**
 * Project a wire row (follower / following / friend / requester) into
 * the canonical `SocialUserSummaryDto`. The function is the only place
 * in the codebase that reads the polymorphic `displayName` / `avatarUrl`
 * fields; downstream code only sees the canonical projection.
 *
 * Defaults are deliberately conservative:
 *
 *   - `userId` falls back to `""` when missing — the item is dropped
 *     by `normalizeSocialOffsetPage` consumers that filter on
 *     `userId.length > 0` (the safe pattern).
 *   - `displayName` / `avatarUrl` fall back to `null` so the UI can
 *     branch on a typed `null` and render a placeholder.
 *   - `isPrivate` defaults to `false` (the public default).
 *   - `createdAt` falls back to the unix epoch so the missing data
 *     shows up as the oldest row possible.
 */
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

/**
 * Project a `UserFollowerItemDto` / `UserFollowingItemDto` row into
 * `SocialUserSummaryDto`. The two SDK shapes are structurally identical
 * (the discriminator is the endpoint, not the row shape), so a single
 * adapter is sufficient.
 */
export function toSocialUserSummaryFromFollowRow(
  input: unknown,
): SocialUserSummaryDto {
  return toUserSummary(input);
}

/**
 * Project a `FriendDto` row into `SocialUserSummaryDto`. The SDK
 * `FriendDto` carries `friendshipId` and `friendSince` that the
 * projection does not preserve — those are presentation concerns of the
 * friends-list page, not the canonical user summary.
 */
export function toSocialUserSummaryFromFriendRow(
  input: unknown,
): SocialUserSummaryDto {
  const wire = (input ?? {}) as UserRowWireDto & {
    readonly friendshipId?: unknown;
    readonly friendSince?: unknown;
  };
  // Discard the friendship internal id — the rest of the app routes by
  // `userId` only (Phase 6 Risks line 54 invariant).
  void wire.friendshipId;
  void wire.friendSince;
  return toUserSummary(input);
}

/**
 * Project a `FriendRequestDto` row into `SocialFriendRequestDto`. The
 * SDK row carries `friendshipId` (the line we route `respond` to) and
 * a flat `requesterUsername` / `requesterDisplayName` /
 * `requesterAvatarUrl` triplet (no nested user object). The adapter
 * promotes the flat triplet into the nested `requester` projection
 * and preserves `friendshipId` as the row's `id`.
 *
 * Note: `friendshipId` is preserved here (under `id`) because the
 * mutation endpoint (TKT-6.1.F*) requires it as the path parameter.
 * The `id` field on the projection is therefore the stable
 * friendship identifier for the request itself, NOT the user
 * identifier — `requesterId` remains the stable user identifier.
 */
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

/**
 * Project a `BlockedUserDto` row into `SocialBlockedUserDto`. The SDK
 * row is minimal (`blockedId` only); the projection joins the
 * viewer-known profile so the blocked-list UI does not have to
 * fan-out an extra fetch per row. Missing user fields are filled with
 * the safe defaults from `toUserSummary`.
 */
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

// ─── Social counts projection ────────────────────────────────────────────

/**
 * The defensive maximum of the SDK counts shape. The SDK emits only
 * `friendCount`, `followerCount`, `followingCount`; the projection
 * adds `blocked`, `pendingIncomingCount`, `pendingOutgoingCount` as
 * optional fields for forward-compatibility. Missing fields default
 * to `0` so the UI can render counters without conditional checks.
 */
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

// ─── Mutual-friend / mutual-follower projection ─────────────────────────

/**
 * The defensive maximum of the SDK `MutualFriendItemDto` shape. The
 * wire DTO is a flat row mirroring the user-summary fields plus
 * `mutualFriendsCount` / `mutualFollowersCount`. The projection joins
 * the flat triplet into a nested `user` summary so the rest of the
 * UI can render the row with the same card primitive used everywhere
 * else.
 */
interface MutualItemWireDto {
  readonly userId?: string;
  readonly username?: string;
  readonly displayName?: unknown;
  readonly avatarUrl?: unknown;
  readonly mutualFriends?: number;
  readonly mutualFollowers?: number;
}

/**
 * Project a wire `MutualFriendItemDto` (or the structurally identical
 * mutual-follower row) into the canonical `SocialMutualDto`. The
 * `mutualFriendsCount` field is the canonical count when the row
 * represents a mutual friend; for mutual-follower rows, the projection
 * prefers `mutualFollowersCount` if it is larger. The projection
 * always carries both counts so the UI can render whichever subcount
 * is meaningful without an extra projection step.
 */
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

// ─── Activity projection (TKT-6.1.E2) ───────────────────────────────────

/**
 * The defensive maximum of the SDK `UserActivityItemDto` shape. The
 * wire DTO carries a single `type` discriminator, an `occurredAt`
 * timestamp, and a free-form `payload` (typed as
 * `{ [key: string]: unknown }` on the SDK side). The projection
 * normalises the wire row into the canonical `SocialActivityItemDto`
 * projection.
 *
 * The `payload` conversion is intentionally permissive — the SDK
 * loses the variant narrowing, so the projection re-narrows via
 * `normalizeSocialFeedItemPayload`. Unknown payloads surface as
 * `null` so the service / read hook can drop the row.
 */
interface ActivityItemWireDto {
  readonly id?: string;
  readonly type?: string;
  readonly occurredAt?: string;
  readonly at?: string;
  readonly payload?: unknown;
}

/**
 * Project a wire `UserActivityItemDto` into the canonical
 * `SocialActivityItemDto`. The `at` field on the projection is sourced
 * from `occurredAt` (the wire field) so the rest of the UI can render
 * a single uniform timestamp accessor.
 *
 * The function returns `null` when the payload is unknown — the
 * `useUserActivity` read hook (TKT-6.1.D3+) drops null rows so the
 * caller always sees a clean array.
 */
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
  // The activity feed carries no actor user on the wire (the user's
  // profile row IS the actor), so the projection synthesises a
  // no-op user summary. Story 6.9 (feed) fills in the actor from the
  // dedicated feed endpoint; the per-user activity endpoint never
  // surfaces the actor because the target user is implicit.
  const actor = toUserSummary({});
  return Object.freeze({
    id,
    type,
    at,
    actorUser: actor,
    payload,
  });
}