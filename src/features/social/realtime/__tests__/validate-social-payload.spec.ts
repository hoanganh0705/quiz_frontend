

import { describe, expect, it } from "vitest";

import { validateSocialPayload } from "../validate-social-payload";

const VALID_ACTOR = "11111111-1111-4111-8111-111111111111";
const VALID_TARGET = "22222222-2222-4222-8222-222222222222";
const VALID_CORRELATION = "33333333-3333-4333-8333-333333333333";

function buildBase() {
return {
version: 1 as const,
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
correlationId: VALID_CORRELATION,
  };
}

describe("validateSocialPayload — well-formed payloads", () => {
it("accepts a well-formed relationship.changed payload", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed blocked.changed payload", () => {
const result = validateSocialPayload("blocked.changed", {
...buildBase(),
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.request.received payload", () => {
const result = validateSocialPayload("friend.request.received", {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
requestedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.request.responded (accept) payload", () => {
const result = validateSocialPayload("friend.request.responded", {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "accept",
respondedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.request.responded (decline) payload", () => {
const result = validateSocialPayload("friend.request.responded", {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "decline",
respondedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.request.cancelled payload", () => {
const result = validateSocialPayload("friend.request.cancelled", {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
cancelledAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.added payload", () => {
const result = validateSocialPayload("friend.added", {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: true,
addedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed friend.removed payload", () => {
const result = validateSocialPayload("friend.removed", {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: false,
removedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed follow.received payload", () => {
const result = validateSocialPayload("follow.received", {
...buildBase(),
followerUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
followedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });

it("accepts a well-formed feed.item.added payload", () => {
const result = validateSocialPayload("feed.item.added", {
...buildBase(),
feedItemId: "feed-1",
feedItemType: "badge_earned",
addedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result.ok).toBe(true);
  });
});

describe("validateSocialPayload — malformed payloads", () => {
it("rejects non-object input as malformed", () => {
expect(validateSocialPayload("relationship.changed", null).ok).toBe(false);
expect(validateSocialPayload("relationship.changed", "string").ok).toBe(
false,
    );
expect(validateSocialPayload("relationship.changed", 42).ok).toBe(false);
  });

it("rejects payload with non-UUID actorUserId", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
actorUserId: "not-a-uuid",
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "malformed" });
  });

it("rejects payload with non-UUID targetUserId", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
targetUserId: "also-not-a-uuid",
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "malformed" });
  });

it("rejects payload with missing actorUserId", () => {
const base = buildBase() as Record<string, unknown>;
delete base.actorUserId;
const result = validateSocialPayload("relationship.changed", {
...base,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "malformed" });
  });

it("rejects payload with empty correlationId", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
correlationId: "",
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "malformed" });
  });

it("rejects payload with non-string correlationId", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
correlationId: 42,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "malformed" });
  });
});

describe("validateSocialPayload — self-action rejection", () => {
it("rejects relationship.changed when actor === target", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_ACTOR,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "self-action" });
  });

it("rejects blocked.changed when actor === target", () => {
const result = validateSocialPayload("blocked.changed", {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_ACTOR,
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "self-action" });
  });

it("rejects friend.added when actor === target", () => {
const result = validateSocialPayload("friend.added", {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_ACTOR,
mutual: true,
addedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "self-action" });
  });
});

describe("validateSocialPayload — version check", () => {
it("rejects payload with version=2 as unknown-version", () => {
const result = validateSocialPayload("relationship.changed", {
...buildBase(),
version: 2,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "unknown-version" });
  });

it("rejects payload with missing version as unknown-version", () => {
const base = buildBase() as Record<string, unknown>;
delete base.version;
const result = validateSocialPayload("relationship.changed", {
...base,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "unknown-version" });
  });
});

describe("validateSocialPayload — friend.request.responded decision check", () => {
it("rejects friend.request.responded with decision='unknown' as unknown-decision", () => {
const result = validateSocialPayload("friend.request.responded", {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "unknown",
respondedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "unknown-decision" });
  });

it("rejects friend.request.responded with missing decision as unknown-decision", () => {
const base = buildBase() as Record<string, unknown>;
const result = validateSocialPayload("friend.request.responded", {
...base,
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
respondedAt: "2026-08-07T00:00:00.000Z",
    });
expect(result).toEqual({ ok: false, reason: "unknown-decision" });
  });
});