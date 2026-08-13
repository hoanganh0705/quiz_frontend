/**
 * `useCommentRealtime.spec.tsx` — unit tests for the comment realtime hook.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.20.
 *
 * ## Coverage contract
 *
 *   - Joins the quiz room on connection via `subscribe_quiz`.
 *   - Routes comment events to the appropriate cache mutation.
 *   - Skips application for events authored by the current user
 *     (optimistic update already handled them).
 *   - Cleans up listeners and unsubscribes on unmount.
 *   - Re-subscribes when quizId changes.
 *   - Disabled state does not connect or subscribe.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useCommentRealtime } from "@/features/comments/hooks/useCommentRealtime";
import * as cacheMutations from "@/features/comments/hooks/useCommentCacheMutations";

// ---------------------------------------------------------------------------
// Mock the socket adapter and auth cookies
// ---------------------------------------------------------------------------

const createSocketMock = vi.fn();
const getAuthTokenMock = vi.fn();

vi.mock("@/lib/realtime/socket-adapter", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/realtime/socket-adapter")
  >("@/lib/realtime/socket-adapter");
  return {
    ...actual,
    createSocket: (...args: unknown[]) => createSocketMock(...args),
  };
});

vi.mock("@/features/auth/utils/auth-cookies", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/utils/auth-cookies")
  >("@/features/auth/utils/auth-cookies");
  return {
    ...actual,
    getAuthToken: () => getAuthTokenMock(),
  };
});

// Mock the cache mutations to spy on calls
vi.mock("@/features/comments/hooks/useCommentCacheMutations", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/comments/hooks/useCommentCacheMutations")
  >("@/features/comments/hooks/useCommentCacheMutations");
  return {
    ...actual,
    applyCommentCreated: vi.fn(),
    applyCommentEdited: vi.fn(),
    applyCommentDeleted: vi.fn(),
    applyCommentHidden: vi.fn(),
    applyCommentRestored: vi.fn(),
    applyVoteCast: vi.fn(),
    applyVoteRemoved: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockSocket() {
  const handlers: Record<string, Set<(...args: unknown[]) => void>> = {};
  const emitCalls: Array<{ event: string; payload: unknown }> = [];
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = new Set();
      handlers[event]!.add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event]?.delete(handler);
    }),
    emit: vi.fn((event: string, payload: unknown) => {
      emitCalls.push({ event, payload });
    }),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: false,
    _handlers: handlers,
    _emit: (event: string, ...args: unknown[]) => {
      handlers[event]?.forEach((h) => h(...args));
    },
    _emitCalls: emitCalls,
  };
}

const QUIZ_ID = "0192f4d8-3333-7000-8000-000000000001";
const USER_ID = "0192f4d8-cccc-7000-8000-00000000000d";
const OTHER_USER_ID = "0192f4d8-eeee-7000-8000-000000000099";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mockSocket: ReturnType<typeof makeMockSocket>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket = makeMockSocket();
  createSocketMock.mockReturnValue(mockSocket);
  getAuthTokenMock.mockReturnValue("test-token");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCommentRealtime", () => {
  it("returns disconnected state when quizId is null", () => {
    const { result } = renderHook(() => useCommentRealtime(null));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe("idle");
  });

  it("returns disconnected state when enabled is false", () => {
    const { result } = renderHook(() =>
      useCommentRealtime(QUIZ_ID, USER_ID, { enabled: false }),
    );

    expect(result.current.isConnected).toBe(false);
  });

  it("connects to the comments namespace when quizId is provided", () => {
    createSocketMock.mockClear();
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    expect(createSocketMock).toHaveBeenCalledWith(
      "/comments",
      expect.objectContaining({
        auth: { token: "test-token" },
      }),
    );
  });

  it("subscribes to the quiz room after connecting", async () => {
    const { result } = renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    // Wait for the socket to be in "connected" state
    await act(async () => {
      mockSocket._emit("connect");
    });

    // Verify isConnected reflects this
    expect(result.current.isConnected).toBe(true);

    // It should have emitted subscribe_quiz
    expect(mockSocket.emit).toHaveBeenCalledWith("subscribe_quiz", {
      quizId: QUIZ_ID,
    });
  });

  it("does not subscribe when disabled", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID, { enabled: false }));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const subscribeCalls = mockSocket.emit.mock.calls.filter(
      (call) => call[0] === "subscribe_quiz",
    );
    expect(subscribeCalls).toHaveLength(0);
  });

  it("routes comment_created events to applyCommentCreated (author is not current user)", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_created",
      commentId: "c-1",
      quizId: QUIZ_ID,
      parentCommentId: null,
      authorId: OTHER_USER_ID,
      authorUsername: "other",
      isReply: false,
      timestamp: new Date().toISOString(),
      snapshot: {
        id: "c-1",
        quizId: QUIZ_ID,
        parentCommentId: null,
        authorId: OTHER_USER_ID,
        authorUsername: "other",
        authorDisplayName: null,
        authorAvatarUrl: null,
        body: "Hello",
        isHidden: false,
        votesCount: 0,
        upvotesCount: 0,
        downvotesCount: 0,
        repliesCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isReply: false,
      },
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentCreated).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("skips event application when author is the current user (optimistic already handled it)", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_created",
      commentId: "c-self",
      quizId: QUIZ_ID,
      parentCommentId: null,
      authorId: USER_ID,
      authorUsername: "self",
      isReply: false,
      timestamp: new Date().toISOString(),
      snapshot: {
        id: "c-self",
        quizId: QUIZ_ID,
        parentCommentId: null,
        authorId: USER_ID,
        authorUsername: "self",
        authorDisplayName: null,
        authorAvatarUrl: null,
        body: "My own comment",
        isHidden: false,
        votesCount: 0,
        upvotesCount: 0,
        downvotesCount: 0,
        repliesCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isReply: false,
      },
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentCreated).not.toHaveBeenCalled();
  });

  it("routes comment_edited events to applyCommentEdited", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_edited",
      commentId: "c-1",
      quizId: QUIZ_ID,
      authorId: OTHER_USER_ID,
      timestamp: new Date().toISOString(),
      snapshot: {
        id: "c-1",
        quizId: QUIZ_ID,
        parentCommentId: null,
        authorId: OTHER_USER_ID,
        authorUsername: "other",
        authorDisplayName: null,
        authorAvatarUrl: null,
        body: "Edited",
        isHidden: false,
        votesCount: 0,
        upvotesCount: 0,
        downvotesCount: 0,
        repliesCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isReply: false,
      },
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentEdited).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("routes comment_deleted events to applyCommentDeleted", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_deleted",
      commentId: "c-1",
      quizId: QUIZ_ID,
      authorId: OTHER_USER_ID,
      timestamp: new Date().toISOString(),
      parentCommentId: null,
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentDeleted).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("routes comment_hidden events to applyCommentHidden", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_hidden",
      commentId: "c-1",
      quizId: QUIZ_ID,
      moderatorId: "mod-1",
      timestamp: new Date().toISOString(),
      snapshot: {
        id: "c-1",
        quizId: QUIZ_ID,
        parentCommentId: null,
        authorId: OTHER_USER_ID,
        authorUsername: "other",
        authorDisplayName: null,
        authorAvatarUrl: null,
        body: "Hidden",
        isHidden: true,
        votesCount: 0,
        upvotesCount: 0,
        downvotesCount: 0,
        repliesCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isReply: false,
      },
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentHidden).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("routes comment_restored events to applyCommentRestored", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "comment_restored",
      commentId: "c-1",
      quizId: QUIZ_ID,
      moderatorId: "mod-1",
      timestamp: new Date().toISOString(),
      snapshot: {
        id: "c-1",
        quizId: QUIZ_ID,
        parentCommentId: null,
        authorId: OTHER_USER_ID,
        authorUsername: "other",
        authorDisplayName: null,
        authorAvatarUrl: null,
        body: "Restored",
        isHidden: false,
        votesCount: 0,
        upvotesCount: 0,
        downvotesCount: 0,
        repliesCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isReply: false,
      },
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyCommentRestored).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("routes vote_cast events to applyVoteCast (voter is not current user)", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "vote_cast",
      commentId: "c-1",
      quizId: QUIZ_ID,
      voterId: OTHER_USER_ID,
      value: "upvote",
      timestamp: new Date().toISOString(),
      votesCount: 1,
      upvotesCount: 1,
      downvotesCount: 0,
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyVoteCast).toHaveBeenCalledWith(payload, USER_ID);
  });

  it("skips vote_cast if the current user is the voter (optimistic already applied)", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "vote_cast",
      commentId: "c-1",
      quizId: QUIZ_ID,
      voterId: USER_ID,
      value: "upvote",
      timestamp: new Date().toISOString(),
      votesCount: 1,
      upvotesCount: 1,
      downvotesCount: 0,
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyVoteCast).not.toHaveBeenCalled();
  });

  it("routes vote_removed events to applyVoteRemoved (voter is not current user)", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "vote_removed",
      commentId: "c-1",
      quizId: QUIZ_ID,
      voterId: OTHER_USER_ID,
      timestamp: new Date().toISOString(),
      votesCount: 0,
      upvotesCount: 0,
      downvotesCount: 0,
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyVoteRemoved).toHaveBeenCalledWith(
      payload,
      USER_ID,
    );
  });

  it("skips vote_removed if the current user is the voter", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    const payload = {
      eventType: "vote_removed",
      commentId: "c-1",
      quizId: QUIZ_ID,
      voterId: USER_ID,
      timestamp: new Date().toISOString(),
      votesCount: 0,
      upvotesCount: 0,
      downvotesCount: 0,
    };

    await act(async () => {
      mockSocket._emit("comment", payload);
    });

    expect(cacheMutations.applyVoteRemoved).not.toHaveBeenCalled();
  });

  it("ignores malformed event payloads", async () => {
    renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    // Send null/undefined/non-object values
    await act(async () => {
      mockSocket._emit("comment", null);
      mockSocket._emit("comment", undefined);
      mockSocket._emit("comment", "string");
      mockSocket._emit("comment", 42);
    });

    expect(cacheMutations.applyCommentCreated).not.toHaveBeenCalled();
    expect(cacheMutations.applyCommentEdited).not.toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", async () => {
    const { unmount } = renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    await act(async () => {
      mockSocket._emit("connect");
    });

    // The hook registers a "comment" listener
    expect(mockSocket.on).toHaveBeenCalledWith("comment", expect.any(Function));

    unmount();

    // It should have removed the listener
    expect(mockSocket.off).toHaveBeenCalledWith(
      "comment",
      expect.any(Function),
    );
  });

  it("unsubscribes from previous quiz room when quizId changes", async () => {
    const OTHER_QUIZ_ID = "0192f4d8-3333-7000-8000-000000000002";

    const { rerender } = renderHook(
      ({ quizId }: { quizId: string }) => useCommentRealtime(quizId, USER_ID),
      { initialProps: { quizId: QUIZ_ID } },
    );

    await act(async () => {
      mockSocket._emit("connect");
    });

    // Now switch to a different quiz
    await act(async () => {
      rerender({ quizId: OTHER_QUIZ_ID });
    });

    // Should have unsubscribed from the first quiz
    expect(mockSocket.emit).toHaveBeenCalledWith("unsubscribe_quiz", {
      quizId: QUIZ_ID,
    });

    // And subscribed to the new one
    expect(mockSocket.emit).toHaveBeenCalledWith("subscribe_quiz", {
      quizId: OTHER_QUIZ_ID,
    });
  });

  it("returns SocketConnectionState with all required states", () => {
    const { result } = renderHook(() => useCommentRealtime(QUIZ_ID, USER_ID));

    // The connectionState should be a valid SocketConnectionState value
    expect([
      "idle",
      "connecting",
      "connected",
      "disconnected",
      "reconnecting",
      "auth_required",
      "error",
    ]).toContain(result.current.connectionState);
  });
});
