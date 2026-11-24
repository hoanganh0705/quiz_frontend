import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  useListInstances,
  extractInstanceItems,
} from "@/features/instances/hooks/useListInstances";

const mockGetFeatureFlagValue = vi.fn();

const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocket = {
  on: mockSocketOn,
  off: mockSocketOff,
};
vi.mock("@/lib/realtime", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/realtime")>("@/lib/realtime");
  return {
    ...actual,
    useSocket: () => ({
      connectionState: "connected",
      socket: mockSocket,
    }),
  };
});

const mockListInstances = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  listInstances: (...args: unknown[]) => mockListInstances(...args),
}));

function TestProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("extractInstanceItems", () => {
  it("handles null or undefined input", () => {
    expect(extractInstanceItems(null)).toEqual([]);
    expect(extractInstanceItems(undefined)).toEqual([]);
  });

  it("handles flat array of instance items", () => {
    const items = [{ instanceId: "i-1", quizTitle: "Quiz 1" }];
    expect(extractInstanceItems(items)).toEqual(items);
  });

  it("handles nested pagination wrapper object", () => {
    const items = [{ instanceId: "i-1", quizTitle: "Quiz 1" }];
    expect(extractInstanceItems({ items })).toEqual(items);
  });

  it("handles array containing pagination wrappers", () => {
    const items = [{ instanceId: "i-1", quizTitle: "Quiz 1" }];
    expect(extractInstanceItems([{ items }])).toEqual(items);
  });
});

describe("useListInstances", () => {
  beforeEach(() => {
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockListInstances.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.skip("returns empty instances when flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(() => useListInstances(), {
      wrapper: TestProvider,
    });

    expect(result.current.instances).toEqual([]);
    expect(mockListInstances).not.toHaveBeenCalled();
  });

  it("fetches and returns instances when flag is live", async () => {
    const mockData = [
      {
        instanceId: "inst-1",
        quizId: "q-1",
        quizTitle: "Science Trivia",
        quizSlug: "science-trivia",
        hostUserId: "u-1",
        hostUsername: "alice",
        playerCount: 3,
        status: "open",
        difficulty: "medium",
        durationMs: 300000,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    mockListInstances.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useListInstances(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.instances).toHaveLength(1);
    });

    expect(result.current.instances[0]?.quizTitle).toBe("Science Trivia");
    expect(result.current.error).toBeNull();
  });

  it("updates player count when instance_player_count_updated event is received", async () => {
    const mockData = [
      {
        instanceId: "inst-1",
        quizId: "q-1",
        quizTitle: "Science Trivia",
        quizSlug: "science-trivia",
        hostUserId: "u-1",
        hostUsername: "alice",
        playerCount: 1,
        status: "open",
        difficulty: "medium",
        durationMs: 300000,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    mockListInstances.mockResolvedValueOnce(mockData);

    const registeredHandlers: Record<string, (data: unknown) => void> = {};
    mockSocketOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
      registeredHandlers[event] = handler;
    });

    const { result } = renderHook(() => useListInstances(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.instances).toHaveLength(1);
    });

    expect(result.current.instances[0]?.playerCount).toBe(1);

    registeredHandlers["instance_player_count_updated"]?.({
      instanceId: "inst-1",
      playerCount: 5,
    });

    await waitFor(() => {
      expect(result.current.instances[0]?.playerCount).toBe(5);
    });
  });

  it("marks instance as closed when instance_closed event is received", async () => {
    const mockData = [
      {
        instanceId: "inst-1",
        quizId: "q-1",
        quizTitle: "Science Trivia",
        quizSlug: "science-trivia",
        hostUserId: "u-1",
        hostUsername: "alice",
        playerCount: 3,
        status: "open",
        difficulty: "medium",
        durationMs: 300000,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    mockListInstances.mockResolvedValueOnce(mockData);

    const registeredHandlers: Record<string, (data: unknown) => void> = {};
    mockSocketOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
      registeredHandlers[event] = handler;
    });

    const { result } = renderHook(() => useListInstances(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.instances).toHaveLength(1);
    });

    registeredHandlers["instance_closed"]?.({
      instanceId: "inst-1",
    });

    await waitFor(() => {
      expect(result.current.instances[0]?.status).toBe("closed");
      expect(result.current.instances[0]?.playerCount).toBe(0);
    });
  });
});
