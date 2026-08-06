/**
 * `friend-request-mutation.service.spec.ts` — Locks the friend-request
 * mutation service contract (TKT-6.8.C1).
 *
 * Coverage:
 *   - sendFriendRequest happy path (201 / 204 No Content resolves void)
 *   - sendFriendRequest → SOCIAL_FRIEND_REQUEST_FORBIDDEN
 *   - sendFriendRequest → SOCIAL_SELF_FRIEND_REQUEST
 *   - sendFriendRequest → SOCIAL_USER_BLOCKED
 *   - sendFriendRequest → SOCIAL_BLOCKED_USER
 *   - sendFriendRequest → UNAUTHORIZED
 *   - respondFriendRequest accept happy path (204 No Content resolves void)
 *   - respondFriendRequest decline happy path (204 No Content resolves void)
 *   - respondFriendRequest rejects unknown action payload at the type level
 *     (compile-time test in a separate type-only file)
 *   - respondFriendRequest → SOCIAL_FRIEND_REQUEST_NOT_FOUND (terminal state)
 *   - respondFriendRequest → SOCIAL_FRIEND_REQUEST_FORBIDDEN
 *   - cancelFriendRequest happy path (204 No Content resolves void)
 *   - cancelFriendRequest → SOCIAL_FRIEND_REQUEST_NOT_FOUND (terminal state)
 *   - cancelFriendRequest → UNAUTHORIZED
 *   - unfriend happy path (204 No Content resolves void)
 *   - unfriend → SOCIAL_FRIENDSHIP_NOT_FOUND (terminal state)
 *   - unfriend → SOCIAL_FRIEND_LIST_FORBIDDEN
 *   - unfriend → UNAUTHORIZED
 *   - Internal-id leakage: friendshipId is never present in any return
 *     object or Sentry breadcrumb payload
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

import {
  cancelFriendRequest,
  respondFriendRequest,
  sendFriendRequest,
  unfriend,
} from "@/features/social/services/friend-request-mutation.service";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockSendFriendRequest = vi.fn();
const mockRespondToFriendRequest = vi.fn();
const mockCancelFriendRequest = vi.fn();
const mockRemoveFriend = vi.fn();

const addBreadcrumbMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getSocial: () => ({
      socialControllerSendFriendRequest: (...args: unknown[]) =>
        mockSendFriendRequest(...args),
      socialControllerRespondToFriendRequest: (...args: unknown[]) =>
        mockRespondToFriendRequest(...args),
      socialControllerCancelFriendRequest: (...args: unknown[]) =>
        mockCancelFriendRequest(...args),
      socialControllerRemoveFriend: (...args: unknown[]) =>
        mockRemoveFriend(...args),
    }),
  };
});

vi.mock("@sentry/nextjs", () => ({
  __esModule: true,
  default: { addBreadcrumb: addBreadcrumbMock },
  addBreadcrumb: addBreadcrumbMock,
}));

afterEach(() => {
  vi.clearAllMocks();
  addBreadcrumbMock.mockClear();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeApiError(
  status: number,
  code: string,
  message: string,
): ApiError {
  return new ApiError({
    name: "AxiosError",
    message,
    isAxiosError: true,
    response: {
      status,
      statusText: "X",
      headers: {},
      config: undefined as never,
      data: {
        type: "https://api.quiz.local/problems/x",
        title: "X",
        status,
        detail: message,
        instance: "/api/v1/x",
        extensions: { code, requestId: "req-test" },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

/** Pull the latest Sentry breadcrumb payload (data field only). */
function lastBreadcrumbData(): Record<string, unknown> {
  const calls = addBreadcrumbMock.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const last = calls[calls.length - 1]![0] as { data?: Record<string, unknown> };
  return last.data ?? {};
}

// ─── sendFriendRequest ───────────────────────────────────────────────────────

describe("friend-request-mutation.service — sendFriendRequest", () => {
  it("resolves void on 201 / 204 No Content", async () => {
    mockSendFriendRequest.mockResolvedValue(undefined);

    const result = await sendFriendRequest("user-2");

    expect(mockSendFriendRequest).toHaveBeenCalledTimes(1);
    expect(mockSendFriendRequest).toHaveBeenCalledWith("user-2");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_FRIEND_REQUEST_FORBIDDEN", async () => {
    mockSendFriendRequest.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_REQUEST_FORBIDDEN", "forbidden"),
    );

    await expect(sendFriendRequest("user-2")).rejects.toMatchObject({
      code: "SOCIAL_FRIEND_REQUEST_FORBIDDEN",
      status: 403,
    });
  });

  it("throws ApiError on SOCIAL_SELF_FRIEND_REQUEST", async () => {
    mockSendFriendRequest.mockRejectedValue(
      makeApiError(400, "SOCIAL_SELF_FRIEND_REQUEST", "self request"),
    );

    await expect(sendFriendRequest("user-self")).rejects.toMatchObject({
      code: "SOCIAL_SELF_FRIEND_REQUEST",
      status: 400,
    });
  });

  it("throws ApiError on SOCIAL_USER_BLOCKED", async () => {
    mockSendFriendRequest.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED", "blocked by target"),
    );

    await expect(sendFriendRequest("user-2")).rejects.toMatchObject({
      code: "SOCIAL_USER_BLOCKED",
      status: 403,
    });
  });

  it("throws ApiError on SOCIAL_BLOCKED_USER", async () => {
    mockSendFriendRequest.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER", "you have blocked target"),
    );

    await expect(sendFriendRequest("user-2")).rejects.toMatchObject({
      code: "SOCIAL_BLOCKED_USER",
      status: 403,
    });
  });

  it("throws ApiError on UNAUTHORIZED", async () => {
    mockSendFriendRequest.mockRejectedValue(
      makeApiError(401, "UNAUTHORIZED", "not signed in"),
    );

    await expect(sendFriendRequest("user-2")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("emits a phase6:6.8 Sentry breadcrumb on success", async () => {
    mockSendFriendRequest.mockResolvedValue(undefined);

    await sendFriendRequest("user-2");

    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    const data = lastBreadcrumbData();
    expect(data.route).toBe("social.sendFriendRequest");
    expect(data.method).toBe("POST");
    expect(data.status).toBe(200);
    expect(data.targetUserId).toBe("user-2");
    // friendshipId is never in the breadcrumb payload.
    expect(Object.keys(data)).not.toContain("friendshipId");
  });
});

// ─── respondFriendRequest ─────────────────────────────────────────────────────

describe("friend-request-mutation.service — respondFriendRequest", () => {
  it("accept happy path: passes friendshipId and { accept: true }", async () => {
    mockRespondToFriendRequest.mockResolvedValue(undefined);

    const result = await respondFriendRequest("fs-abc", "accept");

    expect(mockRespondToFriendRequest).toHaveBeenCalledTimes(1);
    expect(mockRespondToFriendRequest).toHaveBeenCalledWith("fs-abc", {
      accept: true,
    });
    expect(result).toBeUndefined();
  });

  it("decline happy path: passes friendshipId and { accept: false }", async () => {
    mockRespondToFriendRequest.mockResolvedValue(undefined);

    const result = await respondFriendRequest("fs-abc", "decline");

    expect(mockRespondToFriendRequest).toHaveBeenCalledTimes(1);
    expect(mockRespondToFriendRequest).toHaveBeenCalledWith("fs-abc", {
      accept: false,
    });
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_FRIEND_REQUEST_NOT_FOUND (terminal state)", async () => {
    mockRespondToFriendRequest.mockRejectedValue(
      makeApiError(404, "SOCIAL_FRIEND_REQUEST_NOT_FOUND", "no longer pending"),
    );

    await expect(
      respondFriendRequest("fs-abc", "accept"),
    ).rejects.toMatchObject({
      code: "SOCIAL_FRIEND_REQUEST_NOT_FOUND",
      status: 404,
    });
  });

  it("throws ApiError on SOCIAL_FRIEND_REQUEST_FORBIDDEN", async () => {
    mockRespondToFriendRequest.mockRejectedValue(
      makeApiError(
        403,
        "SOCIAL_FRIEND_REQUEST_FORBIDDEN",
        "not authorised to respond",
      ),
    );

    await expect(
      respondFriendRequest("fs-abc", "decline"),
    ).rejects.toMatchObject({
      code: "SOCIAL_FRIEND_REQUEST_FORBIDDEN",
      status: 403,
    });
  });

  it("emits a phase6:6.8 Sentry breadcrumb that does NOT include friendshipId", async () => {
    mockRespondToFriendRequest.mockResolvedValue(undefined);

    await respondFriendRequest("fs-abc", "accept");

    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    const data = lastBreadcrumbData();
    expect(data.route).toBe("social.respondFriendRequest");
    expect(data.method).toBe("POST");
    expect(data.status).toBe(200);
    // The breadcrumb uses the action verb as the correlation key,
    // NOT the friendshipId.
    expect(Object.keys(data)).not.toContain("friendshipId");
    expect(JSON.stringify(data)).not.toContain("fs-abc");
  });
});

// ─── cancelFriendRequest ──────────────────────────────────────────────────────

describe("friend-request-mutation.service — cancelFriendRequest", () => {
  it("resolves void on 204 No Content", async () => {
    mockCancelFriendRequest.mockResolvedValue(undefined);

    const result = await cancelFriendRequest("fs-abc");

    expect(mockCancelFriendRequest).toHaveBeenCalledTimes(1);
    expect(mockCancelFriendRequest).toHaveBeenCalledWith("fs-abc");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_FRIEND_REQUEST_NOT_FOUND (terminal state)", async () => {
    mockCancelFriendRequest.mockRejectedValue(
      makeApiError(404, "SOCIAL_FRIEND_REQUEST_NOT_FOUND", "no longer pending"),
    );

    await expect(cancelFriendRequest("fs-abc")).rejects.toMatchObject({
      code: "SOCIAL_FRIEND_REQUEST_NOT_FOUND",
      status: 404,
    });
  });

  it("throws ApiError on UNAUTHORIZED", async () => {
    mockCancelFriendRequest.mockRejectedValue(
      makeApiError(401, "UNAUTHORIZED", "not signed in"),
    );

    await expect(cancelFriendRequest("fs-abc")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("emits a phase6:6.8 Sentry breadcrumb that does NOT include friendshipId", async () => {
    mockCancelFriendRequest.mockResolvedValue(undefined);

    await cancelFriendRequest("fs-abc");

    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    const data = lastBreadcrumbData();
    expect(data.route).toBe("social.cancelFriendRequest");
    expect(data.method).toBe("DELETE");
    expect(data.status).toBe(200);
    expect(Object.keys(data)).not.toContain("friendshipId");
    expect(JSON.stringify(data)).not.toContain("fs-abc");
  });
});

// ─── unfriend ─────────────────────────────────────────────────────────────────

describe("friend-request-mutation.service — unfriend", () => {
  it("resolves void on 204 No Content", async () => {
    mockRemoveFriend.mockResolvedValue(undefined);

    const result = await unfriend("user-2");

    expect(mockRemoveFriend).toHaveBeenCalledTimes(1);
    expect(mockRemoveFriend).toHaveBeenCalledWith("user-2");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_FRIENDSHIP_NOT_FOUND (terminal state)", async () => {
    mockRemoveFriend.mockRejectedValue(
      makeApiError(404, "SOCIAL_FRIENDSHIP_NOT_FOUND", "not friends"),
    );

    await expect(unfriend("user-2")).rejects.toMatchObject({
      code: "SOCIAL_FRIENDSHIP_NOT_FOUND",
      status: 404,
    });
  });

  it("throws ApiError on SOCIAL_FRIEND_LIST_FORBIDDEN", async () => {
    mockRemoveFriend.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "forbidden list"),
    );

    await expect(unfriend("user-2")).rejects.toMatchObject({
      code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
      status: 403,
    });
  });

  it("throws ApiError on UNAUTHORIZED", async () => {
    mockRemoveFriend.mockRejectedValue(
      makeApiError(401, "UNAUTHORIZED", "not signed in"),
    );

    await expect(unfriend("user-2")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("emits a phase6:6.8 Sentry breadcrumb on success", async () => {
    mockRemoveFriend.mockResolvedValue(undefined);

    await unfriend("user-2");

    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    const data = lastBreadcrumbData();
    expect(data.route).toBe("social.removeFriend");
    expect(data.method).toBe("DELETE");
    expect(data.status).toBe(200);
    expect(data.targetUserId).toBe("user-2");
    expect(Object.keys(data)).not.toContain("friendshipId");
  });
});

// ─── Internal-id leakage (cross-batch invariant 8) ───────────────────────────

describe("friend-request-mutation.service — internal-id hygiene", () => {
  it("returns void from every mutation function (no envelope, no id leakage)", async () => {
    mockSendFriendRequest.mockResolvedValue(undefined);
    mockRespondToFriendRequest.mockResolvedValue(undefined);
    mockCancelFriendRequest.mockResolvedValue(undefined);
    mockRemoveFriend.mockResolvedValue(undefined);

    expect(await sendFriendRequest("user-2")).toBeUndefined();
    expect(await respondFriendRequest("fs-1", "accept")).toBeUndefined();
    expect(await cancelFriendRequest("fs-1")).toBeUndefined();
    expect(await unfriend("user-2")).toBeUndefined();
  });

  it("never includes friendshipId in any Sentry breadcrumb payload", async () => {
    mockSendFriendRequest.mockResolvedValue(undefined);
    mockRespondToFriendRequest.mockResolvedValue(undefined);
    mockCancelFriendRequest.mockResolvedValue(undefined);
    mockRemoveFriend.mockResolvedValue(undefined);

    await sendFriendRequest("user-A");
    await respondFriendRequest("fs-LEAK-1", "accept");
    await cancelFriendRequest("fs-LEAK-2");
    await unfriend("user-B");

    for (const call of addBreadcrumbMock.mock.calls) {
      const arg = call[0] as { data?: Record<string, unknown> };
      const payload = arg.data ?? {};
      const serialised = JSON.stringify(payload);
      expect(serialised).not.toContain("fs-LEAK-1");
      expect(serialised).not.toContain("fs-LEAK-2");
      expect(Object.keys(payload)).not.toContain("friendshipId");
    }
  });
});