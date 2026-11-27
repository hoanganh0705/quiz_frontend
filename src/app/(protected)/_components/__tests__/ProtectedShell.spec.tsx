"use client";

import { useRouter } from "next/navigation";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuthIdentity } from "@/features/auth/hooks/use-auth-session";
import {
  clearAuthToken,
  getAuthToken,
} from "@/features/auth/utils/auth-cookies";

import { ProtectedShell } from "@/app/(protected)/_components/ProtectedShell";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthIdentity: vi.fn(),
}));

vi.mock("@/features/auth/utils/auth-cookies", () => ({
  clearAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuthIdentity);
const mockedClearAuthToken = vi.mocked(clearAuthToken);
const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedUseRouter = vi.mocked(useRouter);

describe("ProtectedShell integration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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

  it("does not redirect when a token is present while auth is still loading", () => {
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

  it("clears stale cookie and redirects on 401 auth failure instead of hanging forever", async () => {
    const replace = vi.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    const err401 = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      error: err401,
      refetch: vi.fn(),
    });
    mockedGetAuthToken.mockReturnValue("stale-token");

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    await waitFor(() => {
      expect(mockedClearAuthToken).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/login\?redirect=/),
      );
    });
  });

  it("renders a retry alert instead of an infinite skeleton on transient server error", () => {
    const refetch = vi.fn(async () => undefined);
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
      error: new Error("Service Unavailable"),
      refetch,
    });
    mockedGetAuthToken.mockReturnValue("token-123");

    render(
      <ProtectedShell>
        <div data-testid="protected-child">child</div>
      </ProtectedShell>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /unable to verify your session/i,
    );
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
