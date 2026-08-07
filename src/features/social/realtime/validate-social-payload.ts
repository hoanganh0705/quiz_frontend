/**
 * Runtime validator for social-event payloads.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.C3.
 *
 * ## Purpose
 *
 * The router (`social-event-router.ts`, TKT-6.10.C1) calls
 * `validateSocialPayload(kind, payload)` before returning a typed
 * `RoutedSocialEvent`. The validator enforces:
 *
 *   - `payload.version === 1` — anything else is dropped with
 *     `{ ok: false, reason: 'unknown-version' }`.
 *   - `payload.actorUserId` and `payload.targetUserId` are valid
 *     UUIDs — invalid / missing IDs are dropped with
 *     `{ ok: false, reason: 'malformed' }`.
 *   - `payload.actorUserId !== payload.targetUserId` — self-action is
 *     dropped with `{ ok: false, reason: 'self-action' }`.
 *   - For `friend.request.responded`, `payload.decision ∈
 *     {'accept', 'decline'}` — otherwise dropped with
 *     `{ ok: false, reason: 'unknown-decision' }`.
 *
 * The validator is **pure**: no Sentry, no console, no network. The
 * caller (the router, or the listener hook that owns telemetry) is
 * responsible for logging the Sentry soft warning.
 */

import { isUuid } from "@/features/social/utils/is-uuid";

import type { SocialEventKind, SocialSocketEventPayload } from "./social-event-payloads";

// ─── Result type ─────────────────────────────────────────────────────────────

/**
 * The discriminated result of `validateSocialPayload`. `ok: true`
 * carries the typed payload; `ok: false` carries a reason code that
 * callers map to a Sentry breadcrumb tag.
 */
export type ValidationResult =
  | { ok: true; payload: SocialSocketEventPayload }
  | {
      ok: false;
      reason: "malformed" | "self-action" | "unknown-version" | "unknown-decision";
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStringOrUuid(value: unknown): value is string {
  return typeof value === "string" && isUuid(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidBaseFields(payload: unknown): payload is {
  version: 1;
  actorUserId: string;
  targetUserId: string;
  correlationId: string;
} {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  if (candidate.version !== 1) return false;
  if (!isStringOrUuid(candidate.actorUserId)) return false;
  if (!isStringOrUuid(candidate.targetUserId)) return false;
  if (typeof candidate.correlationId !== "string") return false;
  if (candidate.correlationId.length === 0) return false;
  return true;
}

// ─── Per-kind validators ─────────────────────────────────────────────────────

function validateRelationshipChanged(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  if (payload.actorUserId === payload.targetUserId)
    return { ok: false, reason: "self-action" };
  const candidate = payload as Record<string, unknown>;
  if (!isRelationshipEnum(candidate.relationship))
    return { ok: false, reason: "malformed" };
  if (!isRelationshipEnum(candidate.previousRelationship))
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.changedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateBlockedChanged(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  if (payload.actorUserId === payload.targetUserId)
    return { ok: false, reason: "self-action" };
  const candidate = payload as Record<string, unknown>;
  if (!isRelationshipEnum(candidate.relationship))
    return { ok: false, reason: "malformed" };
  if (typeof candidate.isBlocked !== "boolean")
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.changedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFriendRequestReceived(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  const candidate = payload as Record<string, unknown>;
  if (!isStringOrUuid(candidate.requesterUserId))
    return { ok: false, reason: "malformed" };
  if (!isStringOrUuid(candidate.recipientUserId))
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.requestedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFriendRequestResponded(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  const candidate = payload as Record<string, unknown>;
  if (!isStringOrUuid(candidate.requesterUserId))
    return { ok: false, reason: "malformed" };
  if (!isStringOrUuid(candidate.recipientUserId))
    return { ok: false, reason: "malformed" };
  if (candidate.decision !== "accept" && candidate.decision !== "decline")
    return { ok: false, reason: "unknown-decision" };
  if (!isIsoTimestamp(candidate.respondedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFriendRequestCancelled(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  const candidate = payload as Record<string, unknown>;
  if (!isStringOrUuid(candidate.requesterUserId))
    return { ok: false, reason: "malformed" };
  if (!isStringOrUuid(candidate.recipientUserId))
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.cancelledAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFriendAdded(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  if (payload.actorUserId === payload.targetUserId)
    return { ok: false, reason: "self-action" };
  const candidate = payload as Record<string, unknown>;
  if (candidate.mutual !== true) return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.addedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFriendRemoved(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  if (payload.actorUserId === payload.targetUserId)
    return { ok: false, reason: "self-action" };
  const candidate = payload as Record<string, unknown>;
  if (candidate.mutual !== false) return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.removedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFollowReceived(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  const candidate = payload as Record<string, unknown>;
  if (!isStringOrUuid(candidate.followerUserId))
    return { ok: false, reason: "malformed" };
  if (!isStringOrUuid(candidate.targetUserId))
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.followedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

function validateFeedItemAdded(payload: unknown): ValidationResult {
  if (!isValidBaseFields(payload)) return { ok: false, reason: "malformed" };
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.feedItemId !== "string" || candidate.feedItemId.length === 0)
    return { ok: false, reason: "malformed" };
  if (typeof candidate.feedItemType !== "string" || candidate.feedItemType.length === 0)
    return { ok: false, reason: "malformed" };
  if (!isIsoTimestamp(candidate.addedAt))
    return { ok: false, reason: "malformed" };
  return { ok: true, payload: payload as SocialSocketEventPayload };
}

// ─── Relationship enum check ─────────────────────────────────────────────────

const RELATIONSHIP_LITERALS = [
  "self",
  "friend",
  "incoming_request",
  "outgoing_request",
  "following",
  "follower",
  "blocked",
  "blocked_by",
  "none",
] as const;

function isRelationshipEnum(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (RELATIONSHIP_LITERALS as readonly string[]).includes(value)
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate a raw social-event payload against the wire format.
 *
 * Returns `{ ok: true, payload }` for well-formed payloads; otherwise
 * returns `{ ok: false, reason }` with one of four reason codes:
 *
 *   - `'malformed'`        — missing or non-UUID `actorUserId` /
 *                            `targetUserId`; missing event-specific
 *                            fields; non-string `correlationId`.
 *   - `'self-action'`      — `actorUserId === targetUserId`.
 *   - `'unknown-version'`  — `payload.version !== 1`.
 *   - `'unknown-decision'` — `friend.request.responded` payload with
 *                            `decision ∉ {'accept', 'decline'}`.
 *
 * The validator is pure: callers must log the Sentry warning.
 *
 * @param kind    - The social event kind (dispatch discriminator).
 * @param payload - The raw payload (typically `unknown`).
 */
export function validateSocialPayload(
  kind: SocialEventKind,
  payload: unknown,
): ValidationResult {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, reason: "malformed" };
  }

  // Version check — applied before per-kind validation so an
  // unrecognised version is always reported as `unknown-version`,
  // not as `malformed`.
  const candidate = payload as Record<string, unknown>;
  if (candidate.version !== 1) {
    return { ok: false, reason: "unknown-version" };
  }

  switch (kind) {
    case "relationship.changed":
      return validateRelationshipChanged(payload);
    case "blocked.changed":
      return validateBlockedChanged(payload);
    case "friend.request.received":
      return validateFriendRequestReceived(payload);
    case "friend.request.responded":
      return validateFriendRequestResponded(payload);
    case "friend.request.cancelled":
      return validateFriendRequestCancelled(payload);
    case "friend.added":
      return validateFriendAdded(payload);
    case "friend.removed":
      return validateFriendRemoved(payload);
    case "follow.received":
      return validateFollowReceived(payload);
    case "feed.item.added":
      return validateFeedItemAdded(payload);
  }
}