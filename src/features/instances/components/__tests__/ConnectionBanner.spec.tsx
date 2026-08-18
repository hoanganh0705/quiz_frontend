

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ConnectionBanner } from "@/features/instances/components/ConnectionBanner";
import { instanceMocks } from "./test-helpers";

vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
useInstanceSocket: (...args: unknown[]) => instanceMocks.useInstanceSocket(...args),
}));

describe("ConnectionBanner", () => {
beforeEach(() => {
vi.clearAllMocks();
instanceMocks.useInstanceSocket.mockReturnValue({
connectionState: "connected",
lastError: null,
subscribe: vi.fn(() => () => undefined),
emitJoin: vi.fn(),
emitLeave: vi.fn(),
    });
  });

afterEach(() => {
cleanup();
  });

it("renders nothing when connected", () => {
const { container } = render(<ConnectionBanner instanceId="inst-1" />);
expect(container.firstChild).toBeNull();
  });

it("renders nothing when idle", () => {
instanceMocks.useInstanceSocket.mockReturnValue({
connectionState: "idle",
lastError: null,
subscribe: vi.fn(() => () => undefined),
emitJoin: vi.fn(),
emitLeave: vi.fn(),
    });
const { container } = render(<ConnectionBanner instanceId="inst-1" />);
expect(container.firstChild).toBeNull();
  });

it("renders the reconnecting banner", () => {
instanceMocks.useInstanceSocket.mockReturnValue({
connectionState: "reconnecting",
lastError: null,
subscribe: vi.fn(() => () => undefined),
emitJoin: vi.fn(),
emitLeave: vi.fn(),
    });
const { getByTestId } = render(<ConnectionBanner instanceId="inst-1" />);
expect(getByTestId("connection-banner").getAttribute("data-state")).toBe(
"reconnecting",
    );
  });

it("renders the auth_failed banner with reauthentication prompt", () => {
instanceMocks.useInstanceSocket.mockReturnValue({
connectionState: "auth_failed",
lastError: null,
subscribe: vi.fn(() => () => undefined),
emitJoin: vi.fn(),
emitLeave: vi.fn(),
    });
render(<ConnectionBanner instanceId="inst-1" />);
expect(screen.getByTestId("connection-banner-reauth")).toBeTruthy();
  });

it("renders nothing when instanceId is null", () => {
const { container } = render(<ConnectionBanner instanceId={null} />);
expect(container.firstChild).toBeNull();
  });
});
