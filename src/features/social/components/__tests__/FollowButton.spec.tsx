/**
 * `FollowButton.spec.tsx` — locks the FollowButton component contract (TKT-6.6.E1).
 *
 * Coverage:
 *   - `Relationship === 'none'` + `canFollow` → "Follow" button calls `follow()`
 *   - `Relationship === 'following'` + `canUnfollow` → "Following" button calls `onUnfollowRequest()`
 *   - `Relationship === 'self'` → `null` (SelfActionGate)
 *   - `canFollow=false && canUnfollow=false` → `null`
 *   - `isLoading=true` → `null`
 *   - `isPending=true` → `FollowPendingIndicator`
 *   - `error !== null` → `FollowErrorBanner` with correct `onRetry`
 *   - `error !== null && relationship !== 'none'` → no retry
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";

import { FollowButton } from "@/features/social/components/FollowButton";

import type { Relationship } from "@/features/social/types";

// ─── Mock self-action gate (renders children — we test the inner CTA) ───────────

const MockSelfActionGate = vi.hoisted(() =>
  vi.fn(({ children }: { children: React.ReactNode }) => children),
);
vi.mock(
  "@/features/social/components/SelfActionGate",
  () => ({
    SelfActionGate: MockSelfActionGate,
  }),
);

// ─── Mock auth bootstrap (required by useRelationship → useSocialPermissions) ─

const mockUseAuthBootstrap = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

// ─── Mock feature flags ────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.hoisted(() => vi.fn(() => "active"));
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// ─── Hoisted mock functions ───────────────────────────────────────────

const mockFollow = vi.hoisted(() => vi.fn());
const mockUnfollowRequest = vi.hoisted(() => vi.fn());

const mockUseRelationship = vi.hoisted(() => vi.fn());
const mockUseSocialPermissions = vi.hoisted(() => vi.fn());
const mockUseFollow = vi.hoisted(() => vi.fn());
const mockUseUnfollow = vi.hoisted(() => vi.fn());

vi.mock("@/features/social/hooks/useRelationship", () => ({
  useRelationship: mockUseRelationship,
}));

vi.mock("@/features/social/hooks/useSocialPermissions", () => ({
  useSocialPermissions: mockUseSocialPermissions,
}));

vi.mock("@/features/social/hooks/useFollow", () => ({
  useFollow: mockUseFollow,
}));

vi.mock("@/features/social/hooks/useUnfollow", () => ({
  useUnfollow: mockUseUnfollow,
}));

// ─── Test provider ─────────────────────────────────────────────────────

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}

// ─── Shared setup ─────────────────────────────────────────────────────

function setup(options?: {
  relationship?: Relationship;
  isLoading?: boolean;
  isPending?: boolean;
  error?: string | null;
  canFollow?: boolean;
  canUnfollow?: boolean;
}) {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId: "viewer-1", id: "viewer-1" },
  });

  mockUseRelationship.mockReturnValue({
    relationship: options?.relationship ?? ("none" as Relationship),
    isLoading: options?.isLoading ?? false,
    isStale: false,
    error: null,
    retry: () => Promise.resolve(),
    isAuthenticated: true,
  });
  mockUseSocialPermissions.mockReturnValue({
    canFollow: options?.canFollow ?? true,
    canUnfollow: options?.canUnfollow ?? true,
    canFriendRequest: false,
    canCancelRequest: false,
    canRespond: false,
    canUnfriend: false,
    canBlock: false,
    canUnblock: false,
    isSelf: options?.relationship === "self",
    isAuthenticated: true,
  });
  mockUseFollow.mockReturnValue({
    follow: mockFollow,
    isPending: options?.isPending ?? false,
    error: options?.error ?? null,
  });
  mockUseUnfollow.mockReturnValue({
    unfollow: vi.fn(),
    isPending: false,
    error: null,
    alreadyNotFollowing: false,
  });

  return render(
    <TestSwrProvider>
      <FollowButton
        targetUserId="user-123"
        onUnfollowRequest={mockUnfollowRequest}
      />
    </TestSwrProvider>,
  );
}

describe("FollowButton — TKT-6.6.E1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockSelfActionGate.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe("relationship === 'none' + canFollow", () => {
    it("renders the Follow button", () => {
      setup({ relationship: "none", canFollow: true });
      expect(screen.getByTestId("follow-button-follow")).toBeInTheDocument();
    });

    it("calls follow() on click", () => {
      setup({ relationship: "none", canFollow: true });
      fireEvent.click(screen.getByTestId("follow-button-follow"));
      expect(mockFollow).toHaveBeenCalledTimes(1);
    });
  });

  describe("relationship === 'following' + canUnfollow", () => {
    it("renders the Following button", () => {
      setup({ relationship: "following", canUnfollow: true });
      expect(
        screen.getByTestId("follow-button-following"),
      ).toBeInTheDocument();
    });

    it("calls onUnfollowRequest (NOT follow()) on click", () => {
      setup({ relationship: "following", canUnfollow: true });
      fireEvent.click(screen.getByTestId("follow-button-following"));
      expect(mockUnfollowRequest).toHaveBeenCalledTimes(1);
      expect(mockFollow).not.toHaveBeenCalled();
    });
  });

  describe("relationship === 'self'", () => {
    it("renders nothing (SelfActionGate)", () => {
      MockSelfActionGate.mockReturnValueOnce(null);
      const { container } = setup({ relationship: "self" });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("canFollow=false && canUnfollow=false", () => {
    it("renders nothing", () => {
      const { container } = setup({ canFollow: false, canUnfollow: false });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("isLoading=true", () => {
    it("renders nothing", () => {
      const { container } = setup({ isLoading: true });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("isPending=true", () => {
    it("renders FollowPendingIndicator", () => {
      setup({ isPending: true, relationship: "none" });
      expect(screen.getByText("Following...")).toBeInTheDocument();
    });
  });

  describe("error !== null", () => {
    it("renders FollowErrorBanner", () => {
      setup({ error: "GLOBAL_INTERNAL_ERROR" });
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("offers retry for follow errors (relationship='none')", () => {
      setup({ error: "GLOBAL_RATE_LIMITED", relationship: "none" });
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(mockFollow).toHaveBeenCalledTimes(1);
    });

    it("does NOT offer retry for social domain errors", () => {
      setup({ error: "SOCIAL_ALREADY_FOLLOWING", relationship: "none" });
      expect(
        screen.queryByRole("button", { name: /retry/i }),
      ).not.toBeInTheDocument();
    });
  });
});
