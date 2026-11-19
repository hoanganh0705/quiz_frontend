"use client";

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/utils/auth-cookies", () => ({
  getAuthToken: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAuthToken } from "@/features/auth/utils/auth-cookies";
import { useRouter } from "next/navigation";
import { ProtectedShell } from "@/app/(protected)/_components/ProtectedShell";

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedUseRouter = vi.mocked(useRouter);

describe("ProtectedShell integration", () => {
  it("renders the checking-state skeleton while the user is loading", () => {
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockedGetAuthToken.mockReturnValue("token-123");

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/checking/i);
    expect(screen.queryByTestId("protected-child")).toBeNull();
  });

  it("renders children when the user is loaded", () => {
    mockedUseAuth.mockReturnValue({
      currentUser: {
        userId: "u-1",
        username: "alice",
        email: "a@example.com",
      } as never,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedGetAuthToken.mockReturnValue("token-123");

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    expect(screen.getByTestId("protected-child")).toHaveTextContent("child");
    expect(screen.getByTestId("protected-shell")).toBeInTheDocument();
  });

  it("redirects to /login when no user and no token are present", async () => {
    const replace = vi.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedGetAuthToken.mockReturnValue(null);

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/login\?redirect=/),
      );
    });
    expect(screen.queryByTestId("protected-child")).toBeNull();
  });

  it("does not redirect when a token is present even if the user is still null", () => {
    const replace = vi.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockedGetAuthToken.mockReturnValue("token-123");

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
