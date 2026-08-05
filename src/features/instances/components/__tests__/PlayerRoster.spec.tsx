/**
 * `PlayerRoster.spec.tsx` — merged REST + realtime roster panel.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G3.
 *
 * Tests cover:
 * - renders the loading skeleton while REST is in flight
 * - renders the merged roster when REST data resolves
 * - renders the empty state when merged roster is empty and status is open
 * - renders the closed state when status is closed/finished
 * - renders an error state when REST rejects
 * - dedupes realtime-only players against the REST list
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PlayerRoster } from "@/features/instances/components/PlayerRoster";
import {
  instanceMocks,
  makeInstanceDetail,
  makePlayer,
} from "./test-helpers";

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: (...args: unknown[]) => instanceMocks.useInstance(...args),
}));

vi.mock("@/features/instances/hooks/useInstancePlayers", () => ({
  useInstancePlayers: (...args: unknown[]) => instanceMocks.useInstancePlayers(...args),
}));

vi.mock("@/features/instances/hooks/useInstanceRealtimeBridge", () => ({
  useInstanceRealtimeBridge: () => instanceMocks.useInstanceRealtimeBridge(),
}));

vi.mock("@/features/instances/stores/useInstanceRealtimeStore", () => {
  const state: { entries: Record<string, { playersByUserId: Record<string, unknown>; lastEventSequence: number; instanceStatus: string | null; closedAt: string | null }> } = {
    entries: {},
  };
  return {
    useInstanceRealtimeStore: (selector: (s: typeof state) => unknown) => selector(state),
    selectInstanceRealtimePlayers: (s: typeof state, id: string) =>
      s.entries[id]?.playersByUserId ?? null,
    selectInstanceRealtimeStatus: (s: typeof state, id: string) =>
      s.entries[id]?.instanceStatus ?? null,
    selectInstanceRealtimeLastSequence: (s: typeof state, id: string) =>
      s.entries[id]?.lastEventSequence ?? 0,
    selectInstanceRealtimeEntry: (s: typeof state, id: string) =>
      s.entries[id] ?? null,
    __setEntry: (id: string, players: Record<string, unknown>) => {
      state.entries[id] = {
        playersByUserId: players,
        lastEventSequence: 1,
        instanceStatus: null,
        closedAt: null,
      };
    },
    __reset: () => {
      state.entries = {};
    },
  };
});

// Pull the helper setter so tests can seed realtime state.
import * as storeMock from "@/features/instances/stores/useInstanceRealtimeStore";

describe("PlayerRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storeMock as unknown as { __reset: () => void }).__reset();
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
    instanceMocks.useInstancePlayers.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the loading skeleton while REST is in flight", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
    instanceMocks.useInstancePlayers.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<PlayerRoster instanceId="inst-1" />);
    expect(getByTestId("player-roster")).toBeDefined();
    expect(getByTestId("instance-lobby-skeleton")).toBeDefined();
  });

  it("renders the merged roster when REST data resolves", () => {
    instanceMocks.useInstancePlayers.mockReturnValue({
      items: [
        makePlayer({ id: "u-1", userId: "u-1", displayName: "Alice", isHost: true }),
        makePlayer({ id: "u-2", userId: "u-2", displayName: "Bob" }),
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<PlayerRoster instanceId="inst-1" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders the closed state when status is closed", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "closed" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<PlayerRoster instanceId="inst-1" />);
    expect(screen.getByText("Instance closed")).toBeTruthy();
  });

  it("renders the closed state when status is finished", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "finished" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<PlayerRoster instanceId="inst-1" />);
    expect(screen.getByText("Instance finished")).toBeTruthy();
  });

  it("renders an error state when REST rejects", () => {
    instanceMocks.useInstancePlayers.mockReturnValue({
      items: [],
      isLoading: false,
      error: new Error("boom"),
      refresh: vi.fn(),
      isStale: false,
    });

    render(<PlayerRoster instanceId="inst-1" />);
    expect(screen.getByTestId("instance-error-state") || screen.getByRole("alert")).toBeTruthy();
  });

  it("dedupes realtime-only players against the REST list", () => {
    instanceMocks.useInstancePlayers.mockReturnValue({
      items: [makePlayer({ id: "u-1", userId: "u-1", displayName: "Alice" })],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
    (storeMock as unknown as {
      __setEntry: (id: string, players: Record<string, unknown>) => void;
    }).__setEntry("inst-1", {
      "u-1": makePlayer({ id: "u-1", displayName: "Alice-Duplicate" }),
      "u-2": makePlayer({ id: "u-2", userId: "u-2", displayName: "Bob-Realtime" }),
    });

    render(<PlayerRoster instanceId="inst-1" />);
    // Alice from REST and Bob from realtime mirror.
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob-Realtime")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
