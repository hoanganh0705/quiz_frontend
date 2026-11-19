import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import type { CurrentUserResponseDto } from "@/lib/api";

vi.mock("@/features/auth/utils/auth-cookies", () => ({
  getAuthToken: vi.fn(),
}));

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getAuth: () => ({
      authControllerGetCurrentUser: mockGetCurrentUser,
    }),
  };
});

import { getAuthToken } from "@/features/auth/utils/auth-cookies";
import { useUserRole } from "../useUserRole";

const render = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useUserRole(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("useUserRole", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockReset();
  });

  it("returns null role and isLoading=false when no auth token is present", async () => {
    vi.mocked(getAuthToken).mockReturnValue(null);

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isVerified).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it("fetches and returns the user role when auth token is present", async () => {
    vi.mocked(getAuthToken).mockReturnValue("valid-token");
    mockGetCurrentUser.mockResolvedValueOnce({
      data: {
        id: "user-1",
        email: "test@example.com",
        role: "admin",
        isVerified: true,
      } as CurrentUserResponseDto,
    });

    const { result } = render();

    await waitFor(() => {
      expect(result.current.role).toBe("admin");
    });

    expect(result.current.isVerified).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("handles fetch error and surfaces it in the hook state", async () => {
    vi.mocked(getAuthToken).mockReturnValue("valid-token");
    const mockError = new Error("Network error");
    mockGetCurrentUser.mockRejectedValueOnce(mockError);

    const { result } = render();

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isVerified).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
