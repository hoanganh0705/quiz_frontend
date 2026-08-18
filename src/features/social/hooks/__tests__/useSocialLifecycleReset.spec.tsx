

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuthBootstrap = vi.fn();
let mockPathname = "/social/me/analytics";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

vi.mock("next/navigation", () => ({
usePathname: () => mockPathname,
}));

import {
__testing,
useSocialLifecycleReset,
} from "@/features/social/hooks/useSocialLifecycleReset";

function setDocCookie(authed: boolean) {
if (typeof document === "undefined") return;
document.cookie = authed ? "auth_token=stub" : "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function dispatchAuthStateChange() {
act(() => {
window.dispatchEvent(new Event(__testing.AUTH_STATE_EVENT));
  });
}

describe("useSocialLifecycleReset — period branch", () => {
beforeEach(() => {
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: true });
mockPathname = "/social/me/analytics";
setDocCookie(true);
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("calls periodReset on logout when on /social/me/analytics", () => {
const periodReset = vi.fn();
const listReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: null,
listReset,
periodReset,
      }),
    );

setDocCookie(false);
dispatchAuthStateChange();

expect(periodReset).toHaveBeenCalledTimes(1);
expect(listReset).not.toHaveBeenCalled();
  });
});

describe("useSocialLifecycleReset — list branch", () => {
beforeEach(() => {
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: true });
mockPathname = "/social/users/u-1/followers";
setDocCookie(true);
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("calls listReset on logout when on /social/users/:id/...", () => {
const periodReset = vi.fn();
const listReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: "u-1",
listReset,
periodReset,
      }),
    );

setDocCookie(false);
dispatchAuthStateChange();

expect(listReset).toHaveBeenCalledTimes(1);
expect(periodReset).not.toHaveBeenCalled();
  });

it("does not call listReset on logout when the path does not match the targetUserId", () => {
mockPathname = "/social/users/u-2/followers";
const listReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: "u-1",
listReset,
      }),
    );

setDocCookie(false);
dispatchAuthStateChange();

expect(listReset).not.toHaveBeenCalled();
  });
});

describe("useSocialLifecycleReset — no-op branches", () => {
beforeEach(() => {
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: true });
setDocCookie(true);
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("does not call either reset on logout when on an unrelated route", () => {
mockPathname = "/social";
const listReset = vi.fn();
const periodReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: "u-1",
listReset,
periodReset,
      }),
    );

setDocCookie(false);
dispatchAuthStateChange();

expect(listReset).not.toHaveBeenCalled();
expect(periodReset).not.toHaveBeenCalled();
  });

it("does not call either reset on a login transition", () => {
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: false });
mockPathname = "/social/me/analytics";
setDocCookie(false);
const listReset = vi.fn();
const periodReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: null,
listReset,
periodReset,
      }),
    );

setDocCookie(true);
dispatchAuthStateChange();

expect(listReset).not.toHaveBeenCalled();
expect(periodReset).not.toHaveBeenCalled();
  });

it("does not call either reset on a no-op auth-state-change event", () => {
mockPathname = "/social/me/analytics";
const listReset = vi.fn();
const periodReset = vi.fn();
renderHook(() =>
useSocialLifecycleReset({
targetUserId: null,
listReset,
periodReset,
      }),
    );

dispatchAuthStateChange();

expect(listReset).not.toHaveBeenCalled();
expect(periodReset).not.toHaveBeenCalled();
  });
});