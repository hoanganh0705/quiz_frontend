

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { JoinLeaveCta } from "@/features/instances/components/JoinLeaveCta";
import {
instanceMocks,
PLAYER_PERMISSIONS,
GUEST_PERMISSIONS,
HOST_PERMISSIONS,
} from "./test-helpers";

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

vi.mock("@/features/instances/hooks/useInstancePermissions", () => ({
useInstancePermissions: () => instanceMocks.useInstancePermissions(),
}));

vi.mock("@/features/instances/hooks/useJoinInstance", () => ({
useJoinInstance: () => instanceMocks.useJoinInstance(),
}));

vi.mock("@/features/instances/hooks/useLeaveInstance", () => ({
useLeaveInstance: () => instanceMocks.useLeaveInstance(),
}));

vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
useInstanceSocket: () => instanceMocks.useInstanceSocket(),
}));

describe("JoinLeaveCta", () => {
beforeEach(() => {
vi.clearAllMocks();
mockUseAuthBootstrap.mockReturnValue({
isAuthenticated: true,
isBootstrapping: false,
isDegraded: false,
bootstrapState: "authenticated",
currentUser: null,
user: null,
error: null,
profileError: null,
refetch: vi.fn(),
clearBootstrap: vi.fn(),
    });
instanceMocks.useInstancePermissions.mockReturnValue(PLAYER_PERMISSIONS);
instanceMocks.useJoinInstance.mockReturnValue({
join: vi.fn(),
state: "idle",
error: null,
reset: vi.fn(),
    });
instanceMocks.useLeaveInstance.mockReturnValue({
leave: vi.fn(),
state: "idle",
error: null,
reset: vi.fn(),
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

it("renders nothing when instanceId is null", () => {
const { container } = render(<JoinLeaveCta instanceId={null} />);
expect(container.firstChild).toBeNull();
  });

it("shows the sign-in CTA for unauthenticated users", () => {
mockUseAuthBootstrap.mockReturnValue({
isAuthenticated: false,
isBootstrapping: false,
isDegraded: false,
bootstrapState: "unauthenticated",
currentUser: null,
user: null,
error: null,
profileError: null,
refetch: vi.fn(),
clearBootstrap: vi.fn(),
    });
render(<JoinLeaveCta instanceId="inst-1" />);
expect(screen.getByTestId("sign-in-to-join-cta")).toBeTruthy();
  });

it("shows the join CTA when canJoin is true", () => {
instanceMocks.useInstancePermissions.mockReturnValue(GUEST_PERMISSIONS);
render(<JoinLeaveCta instanceId="inst-1" />);
expect(screen.getByTestId("join-cta")).toBeTruthy();
  });

it("shows the leave CTA when canLeave is true", () => {
instanceMocks.useInstancePermissions.mockReturnValue(PLAYER_PERMISSIONS);
render(<JoinLeaveCta instanceId="inst-1" />);
expect(screen.getByTestId("leave-cta")).toBeTruthy();
  });

it("hides both CTAs when neither permission is granted", () => {
instanceMocks.useInstancePermissions.mockReturnValue(HOST_PERMISSIONS);
const { queryByTestId } = render(<JoinLeaveCta instanceId="inst-1" />);
expect(queryByTestId("join-cta")).toBeNull();
expect(queryByTestId("leave-cta")).toBeNull();
  });
});
