/**
 * `phase6_6_2_sentry.spec.ts` — Locks the Epic 6.2 Sentry
 * breadcrumb contract (TKT-6.2.H1).
 *
 * Coverage:
 *   - `EPIC_6_2_BREADCRUMB_CATEGORY` is exactly "phase6:6.2".
 *   - `EPIC_6_2_VERSION` is exactly "1.0.0".
 *   - `addSocialListBreadcrumb` emits the documented payload shape
 *     (kind, targetUserId, offset, limit, total?, status?,
 *     durationMs?, code?, epic).
 *   - `addSocialCountsBadgeBreadcrumb` emits the documented payload
 *     (route, targetUserId, status?, durationMs?, code?, epic).
 *   - Optional fields are omitted when not provided.
 *   - The breadcrumb category is exactly `phase6:6.2` for every
 *     emitted event.
 *
 * The Sentry SDK is mocked via `vi.mock` so the test runs in
 * either node or jsdom without requiring the SDK to be
 * initialised.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

import {
  EPIC_6_2_BREADCRUMB_CATEGORY,
  EPIC_6_2_VERSION,
  addSocialCountsBadgeBreadcrumb,
  addSocialListBreadcrumb,
} from "@/lib/social/phase6_6_2_sentry";

beforeEach(() => {
  mockAddBreadcrumb.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("phase6_6_2_sentry — constants", () => {
  it("EPIC_6_2_BREADCRUMB_CATEGORY is exactly 'phase6:6.2'", () => {
    expect(EPIC_6_2_BREADCRUMB_CATEGORY).toBe("phase6:6.2");
  });

  it("EPIC_6_2_VERSION is exactly '1.0.0'", () => {
    expect(EPIC_6_2_VERSION).toBe("1.0.0");
  });
});

describe("phase6_6_2_sentry — addSocialListBreadcrumb", () => {
  it("emits the documented payload shape with every documented field", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
      total: 142,
      status: 200,
      durationMs: 86,
      code: "GLOBAL_NOT_FOUND",
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe(EPIC_6_2_BREADCRUMB_CATEGORY);
    expect(call.data).toEqual({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
      total: 142,
      status: 200,
      durationMs: 86,
      code: "GLOBAL_NOT_FOUND",
      epic: EPIC_6_2_VERSION,
    });
  });

  it("emits a different kind for following / friends / blocked", () => {
    addSocialListBreadcrumb({
      kind: "following",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });
    addSocialListBreadcrumb({
      kind: "friends",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });
    addSocialListBreadcrumb({
      kind: "blocked",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(3);
    const k0 = (mockAddBreadcrumb.mock.calls[0]?.[0] as { data: { kind: string } }).data.kind;
    const k1 = (mockAddBreadcrumb.mock.calls[1]?.[0] as { data: { kind: string } }).data.kind;
    const k2 = (mockAddBreadcrumb.mock.calls[2]?.[0] as { data: { kind: string } }).data.kind;
    expect(k0).toBe("following");
    expect(k1).toBe("friends");
    expect(k2).toBe("blocked");
  });

  it("omits optional fields when not provided", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data.kind).toBe("followers");
    expect(data.targetUserId).toBe("user-1");
    expect(data.offset).toBe(0);
    expect(data.limit).toBe(20);
    expect(data.epic).toBe(EPIC_6_2_VERSION);
    expect(data).not.toHaveProperty("total");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
    expect(data).not.toHaveProperty("code");
  });

  it("keeps the in-flight marker when status and durationMs are undefined", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
      status: undefined,
      durationMs: undefined,
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
  });

  it("emits the breadcrumb through the @sentry/nextjs facade with the documented category", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
      status: 200,
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe("phase6:6.2");
  });
});

describe("phase6_6_2_sentry — addSocialCountsBadgeBreadcrumb", () => {
  it("emits the documented payload shape", () => {
    addSocialCountsBadgeBreadcrumb({
      targetUserId: "user-1",
      status: 200,
      durationMs: 51,
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe(EPIC_6_2_BREADCRUMB_CATEGORY);
    expect(call.data).toEqual({
      route: "social.getCounts",
      targetUserId: "user-1",
      status: 200,
      durationMs: 51,
      epic: EPIC_6_2_VERSION,
    });
  });

  it("includes the error code when the counts endpoint fails", () => {
    addSocialCountsBadgeBreadcrumb({
      targetUserId: "user-1",
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe("phase6:6.2");
    expect(call.data).toEqual({
      route: "social.getCounts",
      targetUserId: "user-1",
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      epic: EPIC_6_2_VERSION,
    });
  });

  it("omits optional fields when not provided", () => {
    addSocialCountsBadgeBreadcrumb({ targetUserId: "user-1" });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data.route).toBe("social.getCounts");
    expect(data.targetUserId).toBe("user-1");
    expect(data.epic).toBe(EPIC_6_2_VERSION);
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
    expect(data).not.toHaveProperty("code");
  });
});

describe("phase6_6_2_sentry — breadcrumb contract", () => {
  it("never emits a breadcrumb with a different category", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });
    addSocialCountsBadgeBreadcrumb({ targetUserId: "user-1" });

    for (const call of mockAddBreadcrumb.mock.calls) {
      const arg = call[0] as Record<string, unknown>;
      expect(arg.category).toBe("phase6:6.2");
    }
  });

  it("emits the epic version on every breadcrumb", () => {
    addSocialListBreadcrumb({
      kind: "followers",
      targetUserId: "user-1",
      offset: 0,
      limit: 20,
    });
    addSocialCountsBadgeBreadcrumb({ targetUserId: "user-1" });

    for (const call of mockAddBreadcrumb.mock.calls) {
      const arg = call[0] as Record<string, unknown>;
      const data = arg.data as Record<string, unknown>;
      expect(data.epic).toBe(EPIC_6_2_VERSION);
    }
  });
});