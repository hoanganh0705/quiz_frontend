/**
 * `InstanceStatusBanner.spec.tsx` — server-driven status banner.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G3.
 *
 * Tests cover:
 * - renders the loading placeholder when REST is loading and no data
 * - renders the closed state for status closed/finished
 * - renders the live status badge for status open/countdown/running
 * - renders nothing when instanceId is null
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { InstanceStatusBanner } from "@/features/instances/components/InstanceStatusBanner";
import { instanceMocks, makeInstanceDetail } from "./test-helpers";

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: (...args: unknown[]) => instanceMocks.useInstance(...args),
}));

vi.mock("@/features/instances/hooks/useInstanceRealtimeBridge", () => ({
  useInstanceRealtimeBridge: () => instanceMocks.useInstanceRealtimeBridge(),
}));

vi.mock("@/features/instances/stores/useInstanceRealtimeStore", () => ({
  useInstanceRealtimeStore: (selector: (state: unknown) => unknown) => {
    const fakeState = {
      entries: {},
    };
    return selector(fakeState);
  },
  selectInstanceRealtimeStatus: (state: { entries: Record<string, { instanceStatus: unknown }> }, id: string) =>
    state.entries[id]?.instanceStatus ?? null,
  selectInstanceRealtimeLastSequence: (state: { entries: Record<string, { lastEventSequence: number }> }, id: string) =>
    state.entries[id]?.lastEventSequence ?? 0,
  selectInstanceRealtimeEntry: (state: { entries: Record<string, unknown> }, id: string) =>
    state.entries[id] ?? null,
  selectInstanceRealtimePlayers: (state: { entries: Record<string, { playersByUserId: unknown }> }, id: string) =>
    state.entries[id]?.playersByUserId ?? null,
}));

describe("InstanceStatusBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the loading placeholder while REST data is in flight", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(getByTestId("instance-status-banner")).toBeDefined();
    expect(getByTestId("instance-status-banner").getAttribute("data-state")).toBe("loading");
  });

  it("renders nothing when instanceId is null", () => {
    const { container } = render(<InstanceStatusBanner instanceId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the closed state for status closed", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "closed" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(screen.getByText("Instance closed")).toBeTruthy();
  });

  it("renders the finished state for status finished", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "finished" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(screen.getByText("Instance finished")).toBeTruthy();
  });

  it("renders the live open badge for status open", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "open" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(getByTestId("instance-status-banner").getAttribute("data-state")).toBe("open");
    expect(screen.getByLabelText("Status: Open")).toBeTruthy();
  });

  it("renders the countdown label for status countdown", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "countdown" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(getByTestId("instance-status-banner").getAttribute("data-state")).toBe("countdown");
    expect(screen.getByLabelText("Status: Starting soon")).toBeTruthy();
  });

  it("renders the running label for status running", () => {
    instanceMocks.useInstance.mockReturnValue({
      instance: makeInstanceDetail({ status: "running" }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { getByTestId } = render(<InstanceStatusBanner instanceId="inst-1" />);
    expect(getByTestId("instance-status-banner").getAttribute("data-state")).toBe("running");
    expect(screen.getByLabelText("Status: In progress")).toBeTruthy();
  });
});
