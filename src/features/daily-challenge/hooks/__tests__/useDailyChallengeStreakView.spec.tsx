import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useDailyChallengeStreakView } from "@/features/daily-challenge/hooks/useDailyChallengeStreakView";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: vi.fn(),
}));

const useAuthSessionMock = vi.mocked(useAuthSession);

beforeEach(() => {
  useAuthSessionMock.mockReset();
});

describe("useDailyChallengeStreakView — unauthenticated", () => {
  it("(1) returns { streak: null, isAuthenticated: false } when unauthenticated", () => {
    useAuthSessionMock.mockReturnValue({
      user: null,
      currentUser: null,
      currentUserId: null,
      isAuthenticated: false,
      isBootstrapping: false,
      bootstrapState: "unauthenticated",
      authSessionId: "anon",
      clearSession: vi.fn(),
    } as unknown as ReturnType<typeof useAuthSession>);

    const { result } = renderHook(() => useDailyChallengeStreakView());

    expect(result.current.streak).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("useDailyChallengeStreakView — authenticated", () => {
  it("(2) returns { streak: 5, isAuthenticated: true } when currentStreak is 5", () => {
    const mockUser = {
      userId: "u-1",
      username: "player",
      email: "player@example.com",
      displayName: null,
      avatarUrl: null,
      bio: null,
      xpTotal: 100,
      currentStreak: 5,
      longestStreak: 10,
      settings: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    useAuthSessionMock.mockReturnValue({
      user: mockUser,
      currentUser: mockUser,
      currentUserId: "u-1",
      isAuthenticated: true,
      isBootstrapping: false,
      bootstrapState: "authenticated",
      authSessionId: "u-1",
      clearSession: vi.fn(),
    } as unknown as ReturnType<typeof useAuthSession>);

    const { result } = renderHook(() => useDailyChallengeStreakView());

    expect(result.current.streak).toBe(5);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("(3) returns { streak: 0, isAuthenticated: true } when the user has not started a streak", () => {
    const mockUser = {
      userId: "u-2",
      username: "player",
      email: "player@example.com",
      displayName: null,
      avatarUrl: null,
      bio: null,
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      settings: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    useAuthSessionMock.mockReturnValue({
      user: mockUser,
      currentUser: mockUser,
      currentUserId: "u-2",
      isAuthenticated: true,
      isBootstrapping: false,
      bootstrapState: "authenticated",
      authSessionId: "u-2",
      clearSession: vi.fn(),
    } as unknown as ReturnType<typeof useAuthSession>);

    const { result } = renderHook(() => useDailyChallengeStreakView());

    expect(result.current.streak).toBe(0);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
