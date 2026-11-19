import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockClearVerificationFlags = vi.fn();
const mockClearAuthToken = vi.fn();
const mockClearAllAuthCache = vi.fn();
const mockBroadcastLogout = vi.fn();
const mockQueryClientClear = vi.fn();

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
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//"),
}));
vi.mock("@/lib/api/core/broadcast-channel", () => ({
  broadcastAuthEvent: () => mockBroadcastLogout(),
}));
vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    clear: mockQueryClientClear,
  }),
}));

beforeEach(() => {
  mockClearVerificationFlags.mockReset();
  mockClearAuthToken.mockReset();
  mockClearAllAuthCache.mockReset();
  mockBroadcastLogout.mockReset();
  mockQueryClientClear.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clearAuthState", () => {
  it("clears all storage artifacts and broadcasts LOGGED_OUT by default", async () => {
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState();

    expect(mockClearVerificationFlags).toHaveBeenCalledTimes(1);
    expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
    expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
  });

  it("skips broadcast when skipBroadcast is true", async () => {
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState({ skipBroadcast: true });

    expect(mockClearVerificationFlags).toHaveBeenCalledTimes(1);
    expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
    expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).not.toHaveBeenCalled();
  });

  it("redirects via location.assign when a safe relative target is provided", async () => {
    const mockAssign = vi.fn();
    vi.stubGlobal("location", { assign: mockAssign });

    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState({ redirectTo: "/login?reason=expired" });

    expect(mockAssign).toHaveBeenCalledWith("/login?reason=expired");
    vi.unstubAllGlobals();
  });

  it("does not redirect when the target is unsafe", async () => {
    const mockAssign = vi.fn();
    vi.stubGlobal("location", { assign: mockAssign });

    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState({ redirectTo: "//evil.com" });
    expect(mockAssign).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("clears the QueryClient cache on logout", async () => {
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState();

    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
  });

  it("skips the cache clear when skipCacheClear is true", async () => {
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    clearAuthState({ skipCacheClear: true });
    expect(mockQueryClientClear).not.toHaveBeenCalled();
  });

  it("does not throw when a primitive throws", async () => {
    mockClearAuthToken.mockImplementationOnce(() => {
      throw new Error("cookie write failed");
    });
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    expect(() => clearAuthState()).not.toThrow();

    expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the QueryClient clear throws", async () => {
    mockQueryClientClear.mockImplementationOnce(() => {
      throw new Error("QueryClient error");
    });
    const { clearAuthState } =
      await import("@/features/auth/utils/clear-auth-state");
    expect(() => clearAuthState()).not.toThrow();

    expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
    expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });
});
