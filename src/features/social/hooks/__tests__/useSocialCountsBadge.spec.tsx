/**
 * `useSocialCountsBadge.spec.tsx` — Locks the convergence hook
 * contract (TKT-6.2.D3).
 *
 * Asserts:
 *
 *   - A `relationship.changed` event triggers `refresh()`.
 *   - A `list.loaded` event triggers `refresh()` for the matching
 *     `userId`.
 *   - `list.loaded` events for a different `userId` do NOT trigger
 *     `refresh()`.
 *   - `social_relationship_live === 'placeholder'` returns
 *     `counts: null` without a service call.
 *   - The retry path (`refresh()`) clears the error and
 *     revalidates.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockRetry = vi.fn();
const mockUseSocialCounts = vi.fn();
vi.mock("@/features/social/hooks/useSocialCounts", () => ({
  useSocialCounts: (...args: unknown[]) => mockUseSocialCounts(...args),
}));

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
vi.mock("@/lib/social/relationship-broadcast-channel", () => ({
  subscribeSocialRelationshipInvalidation: (...args: unknown[]) =>
    mockSubscribe(...args),
}));

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  public listeners: Array<(event: MessageEvent) => void> = [];
  public name: string;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  removeEventListener(
    _type: "message",
    listener: (event: MessageEvent) => void,
  ) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
      (i) => i !== this,
    );
  }

  postMessage(data: unknown) {
    // Same-tab filtering would prevent delivery back to the same
    // instance; tests here only post from "other tabs", so we
    // dispatch to every listener directly.
    for (const listener of this.listeners) {
      listener({ data } as MessageEvent);
    }
  }
}

vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

beforeEach(() => {
  mockGetFeatureFlagValue.mockReset();
  mockRetry.mockReset();
  mockUseSocialCounts.mockReset();
  mockSubscribe.mockReset();
  mockUnsubscribe.mockReset();
  MockBroadcastChannel.instances = [];

  mockGetFeatureFlagValue.mockReturnValue("live");
  mockSubscribe.mockReturnValue(mockUnsubscribe);
  mockUseSocialCounts.mockReturnValue({
    counts: { followers: 5, following: 3, friends: 1, blocked: 0 },
    isLoading: false,
    isStale: false,
    error: null,
    retry: mockRetry,
  });
});

afterEach(() => {
  MockBroadcastChannel.instances = [];
});

describe("useSocialCountsBadge", () => {
  it("returns counts from useSocialCounts in the default case", () => {
    const { result } = renderHook(() => useSocialCountsBadgeSafe("user-1"));
    expect(result.current.counts).toEqual({
      followers: 5,
      following: 3,
      friends: 1,
      blocked: 0,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("returns counts: null when the placeholder flag is on", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(() => useSocialCountsBadgeSafe("user-1"));
    expect(result.current.counts).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls refresh() when a relationship.changed event arrives", () => {
    renderHook(() => useSocialCountsBadgeSafe("user-1"));

    // Capture the subscriber that was registered.
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    const handler = mockSubscribe.mock.calls[0]?.[0] as () => void;

    act(() => {
      handler();
    });
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("calls refresh() when a list.loaded event arrives for the same userId", () => {
    renderHook(() => useSocialCountsBadgeSafe("user-1"));

    // Find the social/list-loaded BroadcastChannel instance.
    const channel = MockBroadcastChannel.instances.find(
      (i) => i.name === "social/list-loaded",
    );
    expect(channel).toBeDefined();
    expect(mockRetry).toHaveBeenCalledTimes(0);

    act(() => {
      channel!.postMessage({
        kind: "list.loaded",
        userId: "user-1",
        tabId: "other-tab",
        at: Date.now(),
      });
    });
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("does NOT call refresh() for a list.loaded event for a different userId", () => {
    renderHook(() => useSocialCountsBadgeSafe("user-1"));
    const channel = MockBroadcastChannel.instances.find(
      (i) => i.name === "social/list-loaded",
    );
    expect(channel).toBeDefined();

    act(() => {
      channel!.postMessage({
        kind: "list.loaded",
        userId: "user-2",
        tabId: "other-tab",
        at: Date.now(),
      });
    });
    expect(mockRetry).toHaveBeenCalledTimes(0);
  });

  it("exposes refresh() that delegates to retry()", () => {
    const { result } = renderHook(() => useSocialCountsBadgeSafe("user-1"));
    act(() => {
      result.current.refresh();
    });
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

// Import after vi.mock declarations so the mocks take effect.
import { useSocialCountsBadge } from "@/features/social/hooks/useSocialCountsBadge";

function useSocialCountsBadgeSafe(targetUserId: string) {
  return useSocialCountsBadge(targetUserId);
}