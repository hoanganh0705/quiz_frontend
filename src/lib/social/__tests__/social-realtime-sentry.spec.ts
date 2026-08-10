/**
 * Spec for `social-realtime-sentry.ts` (TKT-6.10.G2).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.G2.
 *
 * Locks the Phase 6.10 breadcrumb helper contract:
 *   - Every helper emits a breadcrumb with the documented `category`.
 *   - The breadcrumb payload never contains `friendshipId`, `followId`,
 *     `token`, `authorization`, `cookie`, or any event payload field
 *     beyond the four common fields.
 *   - `phase6Social10MalformedPayloadBreadcrumb` emits with category
 *     `social:6.10:malformed-payload`.
 *   - `phase6Social10SelfActionRejectionBreadcrumb` emits with category
 *     `social:6.10:self-action-rejection` and drops silently when
 *     the user id is `friendshipId` / `followId`.
 *   - `phase6Social10SequenceGuardDropBreadcrumb` emits with category
 *     `social:6.10:sequence-guard-drop` and drops silently when the
 *     actor or target id is `friendshipId` / `followId`.
 *   - `addReconnectReconciliationBreadcrumb` emits with category
 *     `social:6.10:reconnect-reconciliation`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addSocialRealtimeBreadcrumb,
  addReconnectReconciliationBreadcrumb,
  phase6Social10MalformedPayloadBreadcrumb,
  phase6Social10SelfActionRejectionBreadcrumb,
  phase6Social10SequenceGuardDropBreadcrumb,
  EPIC_6_10_BREADCRUMB_CATEGORY,
  EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY,
  EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY,
  EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY,
  EPIC_6_10_RECONNECT_CATEGORY,
  SOCIAL_EPIC_6_10_VERSION,
} from "@/lib/social/social-realtime-sentry";

// ─── Module-level mock ─────────────────────────────────────────────────────────

const breadcrumbCalls: Array<{
  category: string;
  data: Record<string, unknown>;
}> = [];

vi.mock("@sentry/nextjs", () => ({
  __esModule: true,
  default: {
    addBreadcrumb: vi.fn((breadcrumb: { category: string; data: Record<string, unknown> }) => {
      breadcrumbCalls.push(breadcrumb);
    }),
  },
  addBreadcrumb: vi.fn((breadcrumb: { category: string; data: Record<string, unknown> }) => {
    breadcrumbCalls.push(breadcrumb);
  }),
}));

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  breadcrumbCalls.length = 0;
});

describe("social:6.10 Sentry breadcrumb helpers (TKT-6.10.G2)", () => {
  describe("phase6Social10MalformedPayloadBreadcrumb", () => {
    it("emits a breadcrumb with category 'social:6.10:malformed-payload'", () => {
      phase6Social10MalformedPayloadBreadcrumb("relationship.changed", "unknown-version");
      expect(breadcrumbCalls[0]?.category).toBe(EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY);
    });

    it("includes eventType and reason in the payload", () => {
      phase6Social10MalformedPayloadBreadcrumb("friend.request.received", "self-action");
      expect(breadcrumbCalls[0]?.data["eventType"]).toBe("friend.request.received");
      expect(breadcrumbCalls[0]?.data["reason"]).toBe("self-action");
    });

    it("includes the epic version", () => {
      phase6Social10MalformedPayloadBreadcrumb("follow.received", "unknown-version");
      expect(breadcrumbCalls[0]?.data["epic"]).toBe(SOCIAL_EPIC_6_10_VERSION);
    });

    it("never includes friendshipId / followId in the payload", () => {
      phase6Social10MalformedPayloadBreadcrumb("relationship.changed", "friendshipId");
      phase6Social10MalformedPayloadBreadcrumb("block.changed", "followId");
      for (const call of breadcrumbCalls) {
        const serialised = JSON.stringify(call.data);
        expect(serialised).not.toMatch(/friendshipId/);
        expect(serialised).not.toMatch(/followId/);
      }
    });
  });

  describe("phase6Social10SelfActionRejectionBreadcrumb", () => {
    it("emits a breadcrumb with category 'social:6.10:self-action-rejection'", () => {
      phase6Social10SelfActionRejectionBreadcrumb("follow.received", "user-1");
      expect(breadcrumbCalls[0]?.category).toBe(EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY);
    });

    it("includes eventType and userId in the payload", () => {
      phase6Social10SelfActionRejectionBreadcrumb("friend.request.received", "user-2");
      expect(breadcrumbCalls[0]?.data["eventType"]).toBe("friend.request.received");
      expect(breadcrumbCalls[0]?.data["userId"]).toBe("user-2");
    });

    it("includes the epic version", () => {
      phase6Social10SelfActionRejectionBreadcrumb("block.changed", "user-3");
      expect(breadcrumbCalls[0]?.data["epic"]).toBe(SOCIAL_EPIC_6_10_VERSION);
    });

    it("drops silently when userId is 'friendshipId' (exact match)", () => {
      phase6Social10SelfActionRejectionBreadcrumb("relationship.changed", "friendshipId");
      expect(breadcrumbCalls.length).toBe(0);
    });

    it("drops silently when userId is 'followId' (exact match)", () => {
      phase6Social10SelfActionRejectionBreadcrumb("follow.received", "followId");
      expect(breadcrumbCalls.length).toBe(0);
    });

    it("never includes token / authorization / cookie", () => {
      phase6Social10SelfActionRejectionBreadcrumb("friend.request.received", "Bearer abc123");
      const serialised = JSON.stringify(breadcrumbCalls[0]?.data);
      expect(serialised).not.toMatch(/token/);
      expect(serialised).not.toMatch(/authorization/);
      expect(serialised).not.toMatch(/cookie/);
    });
  });

  describe("phase6Social10SequenceGuardDropBreadcrumb", () => {
    it("emits a breadcrumb with category 'social:6.10:sequence-guard-drop'", () => {
      phase6Social10SequenceGuardDropBreadcrumb("relationship.changed", "user-a", "user-b", 5);
      expect(breadcrumbCalls[0]?.category).toBe(EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY);
    });

    it("includes eventType, actorUserId, targetUserId, and sequence in the payload", () => {
      phase6Social10SequenceGuardDropBreadcrumb("follow.received", "actor-1", "target-2", 3);
      expect(breadcrumbCalls[0]?.data["eventType"]).toBe("follow.received");
      expect(breadcrumbCalls[0]?.data["actorUserId"]).toBe("actor-1");
      expect(breadcrumbCalls[0]?.data["targetUserId"]).toBe("target-2");
      expect(breadcrumbCalls[0]?.data["sequence"]).toBe(3);
    });

    it("includes the epic version", () => {
      phase6Social10SequenceGuardDropBreadcrumb("block.changed", "user-1", "user-2", 1);
      expect(breadcrumbCalls[0]?.data["epic"]).toBe(SOCIAL_EPIC_6_10_VERSION);
    });

    it("drops silently when actorUserId is 'friendshipId' (exact match)", () => {
      phase6Social10SequenceGuardDropBreadcrumb("relationship.changed", "friendshipId", "user-2", 1);
      expect(breadcrumbCalls.length).toBe(0);
    });

    it("drops silently when targetUserId is 'followId' (exact match)", () => {
      phase6Social10SequenceGuardDropBreadcrumb("follow.received", "user-1", "followId", 1);
      expect(breadcrumbCalls.length).toBe(0);
    });

    it("never includes token / authorization / cookie", () => {
      phase6Social10SequenceGuardDropBreadcrumb(
        "friend.request.received",
        "authvalue123",
        "user-2",
        1,
      );
      const serialised = JSON.stringify(breadcrumbCalls[0]?.data);
      expect(serialised).not.toMatch(/token/);
      expect(serialised).not.toMatch(/authorization/);
      expect(serialised).not.toMatch(/cookie/);
    });
  });

  describe("addReconnectReconciliationBreadcrumb", () => {
    it("emits a breadcrumb with category 'social:6.10:reconnect-reconciliation'", () => {
      addReconnectReconciliationBreadcrumb({
        activeUserIds: ["user-1"],
        invalidationKeys: ["social/v1/requests/incoming"],
        durationMs: 42,
      });
      expect(breadcrumbCalls[0]?.category).toBe(EPIC_6_10_RECONNECT_CATEGORY);
    });

    it("includes activeUserIds, invalidationKeys, and durationMs in the payload", () => {
      addReconnectReconciliationBreadcrumb({
        activeUserIds: ["user-a", "user-b"],
        invalidationKeys: ["social/v1/requests/incoming", "social/v1/requests/outgoing"],
        durationMs: 88,
      });
      expect(breadcrumbCalls[0]?.data["activeUserIds"]).toEqual(["user-a", "user-b"]);
      expect(breadcrumbCalls[0]?.data["invalidationKeys"]).toEqual([
        "social/v1/requests/incoming",
        "social/v1/requests/outgoing",
      ]);
      expect(breadcrumbCalls[0]?.data["durationMs"]).toBe(88);
    });

    it("never includes friendshipId / followId in invalidationKeys", () => {
      breadcrumbCalls.length = 0; // Extra safety: ensure clean slate for this test.
      addReconnectReconciliationBreadcrumb({
        activeUserIds: ["user-1"],
        invalidationKeys: ["social/v1/friendshipId", "social/v1/followId/user-2"],
        durationMs: 10,
      });
      expect(breadcrumbCalls.length).toBeGreaterThanOrEqual(1);
      const serialised = JSON.stringify(breadcrumbCalls[0]?.data);
      expect(serialised).not.toMatch(/friendshipId/);
      expect(serialised).not.toMatch(/followId/);
    });
  });

  describe("addSocialRealtimeBreadcrumb (canonical helper)", () => {
    it("emits a breadcrumb with category 'social:6.10'", () => {
      addSocialRealtimeBreadcrumb({ eventType: "relationship.changed" });
      expect(breadcrumbCalls[0]?.category).toBe(EPIC_6_10_BREADCRUMB_CATEGORY);
    });

    it("sanitises actorUserId when it is 'friendshipId' (exact match)", () => {
      addSocialRealtimeBreadcrumb({ eventType: "relationship.changed", actorUserId: "friendshipId" });
      expect(breadcrumbCalls[0]?.data["actorUserId"]).toBeUndefined();
    });

    it("sanitises targetUserId when it is 'followId' (exact match)", () => {
      addSocialRealtimeBreadcrumb({ eventType: "follow.received", targetUserId: "followId" });
      expect(breadcrumbCalls[0]?.data["targetUserId"]).toBeUndefined();
    });

    it("never includes token / authorization / cookie", () => {
      addSocialRealtimeBreadcrumb({
        eventType: "friend.request.received",
        actorUserId: "Bearer token123",
      });
      const serialised = JSON.stringify(breadcrumbCalls[0]?.data);
      expect(serialised).not.toMatch(/token/);
      expect(serialised).not.toMatch(/authorization/);
      expect(serialised).not.toMatch(/cookie/);
    });
  });
});