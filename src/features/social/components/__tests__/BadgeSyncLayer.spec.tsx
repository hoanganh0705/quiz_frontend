

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as featureFlagsModule from "@/lib/feature-flags";
import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";

import * as notificationRouterModule from "@/features/social/hooks/useNotificationEventRouter";
import * as unreadCountModule from "@/features/notifications/hooks/useUnreadNotificationCount";

import { BadgeSyncLayer } from "@/features/social/components/BadgeSyncLayer";

vi.mock("@/lib/realtime/ws-error", () => ({
decodeWsError: vi.fn().mockReturnValue({
code: "WS_INTERNAL",
message: "Stub error",
authRequired: false,
retryable: false,
  }),
}));

vi.mock("@/lib/swr/mutate-carefully", () => ({
mutateCarefully: () => Promise.resolve(),
}));

let routerCalls = 0;
let unreadCountCalls = 0;

beforeEach(() => {
routerCalls = 0;
unreadCountCalls = 0;

vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");
vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue({
on: () => undefined,
off: () => undefined,
emit: () => undefined,
disconnect: () => undefined,
connect: () => undefined,
connected: false,
  } as unknown as ReturnType<typeof socketAdapterModule.createSocket>);

vi.spyOn(notificationRouterModule, "useNotificationEventRouter").mockImplementation(
() => {
routerCalls += 1;
    },
  );
vi.spyOn(unreadCountModule, "useUnreadNotificationCount").mockImplementation(
() => {
unreadCountCalls += 1;
return { unreadCount: 0, isLoading: false, error: null };
    },
  );
});

afterEach(() => {
cleanup();
vi.restoreAllMocks();
});

describe("BadgeSyncLayer (TKT-6.10.E8)", () => {
it("renders nothing visually (returns null)", () => {
const { container } = render(<BadgeSyncLayer />);
expect(container.firstChild).toBeNull();
  });

it("mounts `useNotificationEventRouter` but not `useUnreadNotificationCount`", () => {

render(<BadgeSyncLayer />);
expect(routerCalls).toBe(1);
expect(unreadCountCalls).toBe(0);
  });

it("returns null and does not mount the router when the feature flag is 'placeholder'", () => {
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue(
"placeholder",
    );

const { container } = render(<BadgeSyncLayer />);
expect(container.firstChild).toBeNull();
expect(routerCalls).toBe(0);
expect(unreadCountCalls).toBe(0);
  });

it("survives multiple mounts (idempotent re-renders)", () => {
const { rerender } = render(<BadgeSyncLayer />);
rerender(<BadgeSyncLayer />);
rerender(<BadgeSyncLayer />);

expect(routerCalls).toBeGreaterThanOrEqual(1);
expect(unreadCountCalls).toBe(0);
  });
});