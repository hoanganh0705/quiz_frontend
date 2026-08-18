

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { HostControls } from "@/features/instances/components/HostControls";
import {
instanceMocks,
HOST_PERMISSIONS,
PLAYER_PERMISSIONS,
} from "./test-helpers";

vi.mock("@/features/instances/hooks/useInstancePermissions", () => ({
useInstancePermissions: () => instanceMocks.useInstancePermissions(),
}));

vi.mock("@/features/instances/hooks/useStartInstance", () => ({
useStartInstance: () => instanceMocks.useStartInstance(),
}));

vi.mock("@/features/instances/hooks/useCloseInstance", () => ({
useCloseInstance: () => instanceMocks.useCloseInstance(),
}));

describe("HostControls", () => {
beforeEach(() => {
vi.clearAllMocks();
instanceMocks.useInstancePermissions.mockReturnValue(PLAYER_PERMISSIONS);
instanceMocks.useStartInstance.mockReturnValue({
start: vi.fn(),
state: "idle",
error: null,
reset: vi.fn(),
    });
instanceMocks.useCloseInstance.mockReturnValue({
close: vi.fn(),
state: "idle",
error: null,
reset: vi.fn(),
    });
  });

afterEach(() => {
cleanup();
  });

it("renders nothing for non-host users", () => {
instanceMocks.useInstancePermissions.mockReturnValue(PLAYER_PERMISSIONS);
const { queryByTestId } = render(<HostControls instanceId="inst-1" />);
expect(queryByTestId("host-start-cta")).toBeNull();
expect(queryByTestId("host-close-cta")).toBeNull();
  });

it("renders start when host has canStart permission", () => {
instanceMocks.useInstancePermissions.mockReturnValue(HOST_PERMISSIONS);
render(<HostControls instanceId="inst-1" />);
expect(screen.getByTestId("host-start-cta")).toBeTruthy();
  });

it("renders close for host with canClose permission only", () => {
instanceMocks.useInstancePermissions.mockReturnValue({
...HOST_PERMISSIONS,
canStart: false,
canCancel: false,
canClose: true,
    });
render(<HostControls instanceId="inst-1" />);
expect(screen.queryByTestId("host-start-cta")).toBeNull();
expect(screen.getByTestId("host-close-cta")).toBeTruthy();
  });

it("renders nothing when instanceId is null", () => {
const { container } = render(<HostControls instanceId={null} />);
expect(container.firstChild).toBeNull();
  });
});
