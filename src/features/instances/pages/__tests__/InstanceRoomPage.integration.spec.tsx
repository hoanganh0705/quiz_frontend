import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { InstanceRoomPage } from "@/features/instances/pages/InstanceRoomPage";
import {
  instanceMocks,
  makeInstanceDetail,
} from "../../components/__tests__/test-helpers";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: () => instanceMocks.useInstance(),
}));


vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
  useInstanceSocket: () => instanceMocks.useInstanceSocket(),
}));

vi.mock("@/features/instances/components", () => ({
  ConnectionBanner: () => <div data-testid="connection-banner" />,
  InstanceClosedState: () => <div data-testid="instance-closed-state-stub" />,
  InstanceErrorState: ({ error }: { error: unknown }) => (
    <div data-testid="instance-error-state">{error ? "error" : "no-error"}</div>
  ),
  InstanceLobby: () => <div data-testid="instance-lobby" />,
  InstanceLobbySkeleton: () => <div data-testid="instance-lobby-skeleton" />,
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

  it("renders the closed state for status closed and redirects to /instances", () => {
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
    expect(mockPush).toHaveBeenCalledWith("/instances");
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

  it("does not redirect an already-finished player back to /play while room is running", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({
        status: "running",
        players: [
          {
            instancePlayerId: "ip-1",
            userId: "u-1",
            username: "player1",
            displayName: "Player 1",
            avatarUrl: null,
            joinedAt: "2026-01-01T00:00:00Z",
            status: "finished",
            score: 100,
            rank: 1,
            lastActivityAt: "2026-01-01T00:05:00Z",
          },
        ] as unknown as ReturnType<typeof makeInstanceDetail>["players"],
      }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<InstanceRoomPage instanceId="inst-1" />);
    expect(mockPush).not.toHaveBeenCalledWith("/instances/inst-1/play");
  });

  it("shows View Final Results CTA without redirecting when status is finished", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "finished" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceRoomPage instanceId="inst-1" />);
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "finished",
    );
    expect(getByTestId("view-final-results-link")).toBeDefined();
    expect(mockPush).not.toHaveBeenCalledWith("/instances");
  });

  it("blocks non-participants when a match is already in progress without redirecting to /play", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({
        hostUserId: "host-99",
        status: "running",
        players: [
          {
            instancePlayerId: "ip-host",
            userId: "host-99",
            username: "host",
            displayName: "Host",
            avatarUrl: null,
            joinedAt: "2026-01-01T00:00:00Z",
            status: "playing",
          },
        ] as unknown as ReturnType<typeof makeInstanceDetail>["players"],
      }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId, getByText } = render(
      <InstanceRoomPage instanceId="inst-1" />,
    );
    expect(getByTestId("instance-room-page").getAttribute("data-state")).toBe(
      "in-progress",
    );
    expect(getByText("Match Already in Progress")).toBeDefined();
    expect(mockPush).not.toHaveBeenCalledWith("/instances/inst-1/play");
  });
});
