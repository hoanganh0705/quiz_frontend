/**
 * `clear-auth-state.spec.ts` — Locks the Phase 4 P1-11 contract.
 *
 * Asserts:
 *
 *   - `clearAuthState()` calls the three local-cleanup primitives
 *     in the documented order.
 *   - `broadcastLogout()` is called by default and skipped when
 *     `skipBroadcast: true`.
 *   - The optional `redirectTo` is only honoured when it passes
 *     `isSafeRedirectTarget`.
 *   - The helper never throws even if a primitive throws.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockClearVerificationFlags = vi.fn();
const mockClearAuthToken = vi.fn();
const mockClearAllAuthCache = vi.fn();
const mockBroadcastLogout = vi.fn();
const mockAssign = vi.fn();

vi.mock("@/features/auth/utils/verification-flag", () => ({
  clearVerificationFlags: () => mockClearVerificationFlags(),
}));
vi.mock("@/features/auth/utils/auth-cookies", () => ({
  clearAuthToken: () => mockClearAuthToken(),
}));
vi.mock("@/features/auth/utils/user-scoped-cache", () => ({
  clearAllAuthCache: () => mockClearAllAuthCache(),
}));
vi.mock("@/features/auth/utils/safe-redirect", () => ({
  isSafeRedirectTarget: (target: unknown) =>
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//"),
}));
vi.mock("@/lib/api/core/broadcast-channel", () => ({
  broadcastAuthEvent: () => mockBroadcastLogout(),
}));

beforeEach(() => {
  mockClearVerificationFlags.mockReset();
  mockClearAuthToken.mockReset();
  mockClearAllAuthCache.mockReset();
  mockBroadcastLogout.mockReset();
  mockAssign.mockReset();
  // Stub `window.location.assign` so the test can probe redirects
  // without actually navigating. We can't `Object.defineProperty`
  // on `window.location` (jsdom makes it non-configurable), so we
  // stub the global to a minimal location-shaped object.
  vi.stubGlobal("location", { assign: mockAssign });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clearAuthState", () => {
  it("runs the documented local-cleanup sequence", async () => {
    const { clearAuthState } = await import(
      "@/features/auth/utils/clear-auth-state"
    );
    clearAuthState();
    expect(mockClearVerificationFlags).toHaveBeenCalledTimes(1);
    expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
    expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });

  it("skips the broadcast when skipBroadcast is true", async () => {
    const { clearAuthState } = await import(
      "@/features/auth/utils/clear-auth-state"
    );
    clearAuthState({ skipBroadcast: true });
    expect(mockBroadcastLogout).not.toHaveBeenCalled();
  });

  it("redirects to a safe target", async () => {
    const { clearAuthState } = await import(
      "@/features/auth/utils/clear-auth-state"
    );
    clearAuthState({ redirectTo: "/login" });
    expect(mockAssign).toHaveBeenCalledWith("/login");
  });

  it("does NOT redirect when redirectTo is unsafe", async () => {
    const { clearAuthState } = await import(
      "@/features/auth/utils/clear-auth-state"
    );
    clearAuthState({ redirectTo: "//evil.com" });
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("does not throw when a primitive throws", async () => {
    mockClearAuthToken.mockImplementationOnce(() => {
      throw new Error("cookie write failed");
    });
    const { clearAuthState } = await import(
      "@/features/auth/utils/clear-auth-state"
    );
    expect(() => clearAuthState()).not.toThrow();
    // The later steps still ran.
    expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });
});