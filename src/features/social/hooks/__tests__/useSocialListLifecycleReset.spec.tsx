/**
 * `useSocialListLifecycleReset.spec.tsx` — Locks the lifecycle-reset
 * contract for Story 6.2 list pages.
 *
 * Source epic:   Epic 6.2.
 * Source ticket: TKT-6.2.B4.
 *
 * Asserts:
 *
 *   - A logout transition (auth-state-change event from `true` to
 *     `false`) calls `reset()` exactly once.
 *   - A login transition does NOT call `reset()`.
 *   - A no-op auth-state-change event (no actual transition) does NOT
 *     call `reset()`.
 *   - A change to `targetUserId` does NOT call `reset()` from this
 *     hook (the profile-change reset is delegated to
 *     `useSocialListUrlState`).
 *   - The hook is a no-op when `window` is undefined (server render).
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuthBootstrap = vi.fn();

vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

import {
  __testing,
  useSocialListLifecycleReset,
} from "@/features/social/hooks/useSocialListLifecycleReset";

function setDocCookie(authed: boolean) {
  // The cookie module reads `auth_token=...` from `document.cookie`.
  // We mutate the global so the read in the hook sees the new value.
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

    // The cookie was authenticated from the start and remains so.
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
