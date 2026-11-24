import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import InstanceRoomRoute, {
  metadata,
} from "@/app/(protected)/instances/[id]/page";
const mockUseInstance = vi.fn();
const mockUseAuthBootstrap = vi.fn();

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

vi.mock("@/features/instances/hooks/useInstance", () => ({
  useInstance: () => mockUseInstance(),
}));


vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
  useInstanceSocket: () => ({
    connectionState: "idle",
    lastError: null,
    subscribe: vi.fn(() => () => undefined),
    emitJoin: vi.fn(),
    emitLeave: vi.fn(),
  }),
}));

vi.mock("@/features/instances/pages/InstanceRoomPage", async () => {
  return {
    InstanceRoomPage: ({ instanceId }: { instanceId: string | null }) => (
      <div
        data-testid="instance-room-page-stub"
        data-instance-id={instanceId ?? "null"}
      />
    ),
  };
});


describe("/instances/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInstance.mockReturnValue({
      instance: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });
    mockUseAuthBootstrap.mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
      user: null,
      bootstrapState: "unauthenticated",
      isBootstrapping: false,
      isDegraded: false,
      error: null,
      profileError: null,
      refetch: vi.fn(),
      clearBootstrap: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("resolves the [id] param and delegates to InstanceRoomPage", async () => {
    const element = await InstanceRoomRoute({
      params: Promise.resolve({ id: "inst-42" }),
    });

    render(element);

    const stub = screen.getByTestId("instance-room-page-stub");
    expect(stub.getAttribute("data-instance-id")).toBe("inst-42");
  });

  it("exports a metadata object with the documented title", () => {
    expect(metadata?.title).toBeTruthy();
  });
});
