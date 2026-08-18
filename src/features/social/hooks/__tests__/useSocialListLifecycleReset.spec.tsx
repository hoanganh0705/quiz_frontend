

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuthBootstrap = vi.fn();

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

import {
__testing,
useSocialListLifecycleReset,
} from "@/features/social/hooks/useSocialListLifecycleReset";

function setDocCookie(authed: boolean) {

if (typeof document === "undefined") return;
document.cookie = authed ? "auth_token=stub" : "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

describe("useSocialListLifecycleReset", () => {
beforeEach(() => {
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: true });
setDocCookie(true);
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("calls reset on logout (auth true → false)", () => {
const reset = vi.fn();
renderHook(() =>
useSocialListLifecycleReset({ targetUserId: "u-1", reset }),
    );

setDocCookie(false);
act(() => {
window.dispatchEvent(new Event(__testing.AUTH_STATE_EVENT));
    });

expect(reset).toHaveBeenCalledTimes(1);
  });

it("does not call reset on a login transition (auth false → true)", () => {
mockUseAuthBootstrap.mockReturnValue({ isAuthenticated: false });
setDocCookie(false);
const reset = vi.fn();
renderHook(() =>
useSocialListLifecycleReset({ targetUserId: "u-1", reset }),
    );

setDocCookie(true);
act(() => {
window.dispatchEvent(new Event(__testing.AUTH_STATE_EVENT));
    });

expect(reset).not.toHaveBeenCalled();
  });

it("does not call reset on a no-op auth-state-change event", () => {
const reset = vi.fn();
renderHook(() =>
useSocialListLifecycleReset({ targetUserId: "u-1", reset }),
    );

act(() => {
window.dispatchEvent(new Event(__testing.AUTH_STATE_EVENT));
    });

expect(reset).not.toHaveBeenCalled();
  });

it("does not call reset on a targetUserId change", () => {
const reset = vi.fn();
const { rerender } = renderHook(
({ userId }: { userId: string }) =>
useSocialListLifecycleReset({ targetUserId: userId, reset }),
{ initialProps: { userId: "u-1" } },
    );
rerender({ userId: "u-2" });
expect(reset).not.toHaveBeenCalled();
  });

it("readIsAuthenticatedFromWindow returns false when no cookie is set", () => {
setDocCookie(false);
expect(__testing.readIsAuthenticatedFromWindow()).toBe(false);
  });

it("readIsAuthenticatedFromWindow returns true when the cookie is set", () => {
setDocCookie(true);
expect(__testing.readIsAuthenticatedFromWindow()).toBe(true);
  });
});
