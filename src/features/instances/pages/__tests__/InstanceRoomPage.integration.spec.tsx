/**
 * `InstanceRoomPage.integration.spec.tsx` — page composition.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G3.
 *
 * Tests cover:
 * - renders the placeholder when the feature flag is placeholder
 * - renders the skeleton during the initial REST fetch
 * - renders the lobby once detail resolves
 * - renders the closed state for status closed/finished
 * - renders the error state for typed page-level error codes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { InstanceRoomPage } from "@/features/instances/pages/InstanceRoomPage";
import { instanceMocks, makeInstanceDetail } from "../../components/__tests__/test-helpers";

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: () => instanceMocks.useInstance(),
}));

vi.mock("@/features/instances/hooks/useInstancesFeatureFlag", () => ({
  useInstancesFeatureFlag: () => instanceMocks.useInstancesFeatureFlag(),
}));

vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
  useInstanceSocket: () => instanceMocks.useInstanceSocket(),
}));

// Stub the composed children so the test focuses on the page composition.
vi.mock("@/features/instances/components", () => ({
  ConnectionBanner: () => <div data-testid="connection-banner" />,
  InstanceClosedState: () => <div data-testid="instance-closed-state-stub" />,
  InstanceErrorState: ({ error }: { error: unknown }) => (
    <div data-testid="instance-error-state">{error ? "error" : "no-error"}</div>
  ),
  InstanceLobby: () => <div data-testid="instance-lobby" />,
  InstanceLobbySkeleton: () => <div data-testid="instance-lobby-skeleton" />,
  InstancePlaceholder: () => <div data-testid="instance-placeholder" />,
}));

describe("InstanceRoomPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthBootstrap.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      isDegraded: false,
      bootstrapState: "authenticated",
      currentUser: { userId: "u-1" },
      user: null,
      error: null,
      profileError: null,
      refetch: vi.fn(),
      clearBootstrap: vi.fn(),
    });
    instanceMocks.useInstancesFeatureFlag.mockReturnValue({
      isPlaceholder: false,
      flagValue: "live",
    });
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
    instanceMocks.useInstanceSocket.mockReturnValue({
      connectionState: "idle",
      lastError: null,
      subscribe: vi.fn(() => () => undefined),
      emitJoin: vi.fn(),
      emitLeave: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the placeholder when the feature flag is placeholder", () => {
    instanceMocks.useInstancesFeatureFlag.mockReturnValue({
      isPlaceholder: true,
      flagValue: "placeholder",
    });

    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "placeholder",
    );
    expect(getByTestId("instance-placeholder")).toBeDefined();
  });

  it("renders the skeleton during the initial REST fetch", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "loading",
    );
    expect(getByTestId("instance-lobby-skeleton")).toBeDefined();
  });

  it("renders the lobby once detail resolves", () => {
    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "live",
    );
    expect(getByTestId("instance-lobby")).toBeDefined();
  });

  it("renders the closed state for status closed", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "closed" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "closed",
    );
    expect(getByTestId("instance-closed-state-stub")).toBeDefined();
  });

  it("renders the error state for typed page-level error codes", () => {
    const apiErr = Object.assign(new Error("not found"), {
      code: "INSTANCE_NOT_FOUND",
      message: "Instance not found",
    });
    instanceMocks.useInstance.mockReturnValue({
      instance: null,
      isLoading: false,
      error: apiErr,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "error",
    );
    expect(getByTestId("instance-error-state")).toBeDefined();
  });

  it("renders the no-id error state when instanceId is null", () => {
    const { getByTestId } = render(<InstanceRoomPage instanceId={null} />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "no-id",
    );
  });
});
