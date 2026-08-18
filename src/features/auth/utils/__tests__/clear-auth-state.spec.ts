

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockClearVerificationFlags = vi.fn();
const mockClearAuthToken = vi.fn();
const mockClearAllAuthCache = vi.fn();
const mockBroadcastLogout = vi.fn();
const mockGlobalMutate = vi.fn();
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
vi.mock("swr", () => ({

mutate: (...args: unknown[]) => {
mockGlobalMutate(...(args as Parameters<typeof mockGlobalMutate>));
  },
}));

beforeEach(() => {
mockClearVerificationFlags.mockReset();
mockClearAuthToken.mockReset();
mockClearAllAuthCache.mockReset();
mockBroadcastLogout.mockReset();
mockGlobalMutate.mockReset();
mockAssign.mockReset();

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

it("wipes the SWR in-memory cache via the wildcard predicate", async () => {
const { clearAuthState } = await import(
"@/features/auth/utils/clear-auth-state"
    );
clearAuthState();

expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
const [predicate, data, opts] = mockGlobalMutate.mock.calls[0] ?? [];

expect(typeof predicate).toBe("function");

expect((predicate as () => boolean)()).toBe(true);

expect(data).toBeUndefined();

expect(opts).toEqual({ revalidate: true });
  });

it("skips the SWR wipe when skipSwrCacheClear is true", async () => {
const { clearAuthState } = await import(
"@/features/auth/utils/clear-auth-state"
    );
clearAuthState({ skipSwrCacheClear: true });
expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

it("does not throw when a primitive throws", async () => {
mockClearAuthToken.mockImplementationOnce(() => {
throw new Error("cookie write failed");
    });
const { clearAuthState } = await import(
"@/features/auth/utils/clear-auth-state"
    );
expect(() => clearAuthState()).not.toThrow();

expect(mockClearAllAuthCache).toHaveBeenCalledTimes(1);
expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });

it("does not throw when the SWR mutate mock throws", async () => {
mockGlobalMutate.mockImplementationOnce(() => {
throw new Error("SWR not mounted");
    });
const { clearAuthState } = await import(
"@/features/auth/utils/clear-auth-state"
    );
expect(() => clearAuthState()).not.toThrow();

expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
expect(mockBroadcastLogout).toHaveBeenCalledTimes(1);
  });
});