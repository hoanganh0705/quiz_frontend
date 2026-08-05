/**
 * `InstanceLobby.spec.tsx` — composed lobby layout.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G3.
 *
 * Tests cover:
 * - renders the documented layout when status is open
 * - suppresses the CTA row when status is closed
 * - suppresses the CTA row when status is finished
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { InstanceLobby } from "@/features/instances/components/InstanceLobby";
import { instanceMocks, makeInstanceDetail } from "./test-helpers";

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: () => instanceMocks.useInstance(),
}));

vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
  useInstanceSocket: () => instanceMocks.useInstanceSocket(),
}));

// Stub the composed children so the test focuses on the lobby layout itself.
vi.mock("@/features/instances/components/InstanceStatusBanner", () => ({
  InstanceStatusBanner: () => <div data-testid="status-banner" />,
}));
vi.mock("@/features/instances/components/ConnectionBanner", () => ({
  ConnectionBanner: () => <div data-testid="connection-banner" />,
}));
vi.mock("@/features/instances/components/PlayerRoster", () => ({
  PlayerRoster: () => <div data-testid="player-roster" />,
}));
vi.mock("@/features/instances/components/JoinLeaveCta", () => ({
  JoinLeaveCta: () => <div data-testid="join-leave-cta" />,
}));
vi.mock("@/features/instances/components/HostControls", () => ({
  HostControls: () => <div data-testid="host-controls" />,
}));

describe("InstanceLobby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders the full layout when status is open", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "open" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceLobby instanceId="inst-1" />);
    expect(getByTestId("instance-lobby")).toBeDefined();
    expect(getByTestId("status-banner")).toBeDefined();
    expect(getByTestId("player-roster")).toBeDefined();
    expect(getByTestId("join-leave-cta")).toBeDefined();
    expect(getByTestId("host-controls")).toBeDefined();
  });

  it("suppresses the CTA row when status is closed", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "closed" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { queryByTestId } = render(<InstanceLobby instanceId="inst-1" />);
    expect(queryByTestId("join-leave-cta")).toBeNull();
    expect(queryByTestId("host-controls")).toBeNull();
  });

  it("suppresses the CTA row when status is finished", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "finished" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { queryByTestId } = render(<InstanceLobby instanceId="inst-1" />);
    expect(queryByTestId("join-leave-cta")).toBeNull();
    expect(queryByTestId("host-controls")).toBeNull();
  });
});
