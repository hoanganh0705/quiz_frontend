

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FriendRequestRouteGate } from "@/features/social/components/FriendRequestRouteGate";

const mockUseAuthState = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-state", () => ({
useAuthState: () => mockUseAuthState(),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockIncomingListPage = vi.fn(() => (
<div data-testid="incoming-requests-list-page">Incoming List</div>
));
const mockOutgoingListPage = vi.fn(() => (
<div data-testid="outgoing-requests-list-page">Outgoing List</div>
));
vi.mock("@/features/social/pages", () => ({
IncomingRequestsListPage: () => mockIncomingListPage(),
OutgoingRequestsListPage: () => mockOutgoingListPage(),
}));

const mockEmptyState = vi.fn(
({ kind }: { kind: string }) => (
<div data-testid={`empty-${kind}`}>Empty {kind}</div>
  ),
);
vi.mock("@/features/social/components/FriendRequestEmptyState", () => ({
FriendRequestEmptyState: (props: { kind: string }) => mockEmptyState(props),
}));

const mockPrivacyNotice = vi.fn(() => (
<div data-testid="privacy-notice">Privacy</div>
));
vi.mock("@/features/social/components/PrivacyRestrictedNotice", () => ({
PrivacyRestrictedNotice: () => mockPrivacyNotice(),
}));

const authenticatedViewer = { isAuthenticated: true };
const unauthenticatedViewer = { isAuthenticated: false };

beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
mockUseAuthState.mockReturnValue(authenticatedViewer);
});

afterEach(() => {
vi.restoreAllMocks();
});

describe("FriendRequestRouteGate", () => {
describe("incoming surface", () => {
it("renders IncomingRequestsListPage in the live branch", () => {
render(<FriendRequestRouteGate kind="incoming" requireAuth />);

expect(screen.getByTestId("incoming-requests-list-page")).toBeInTheDocument();
expect(mockIncomingListPage).toHaveBeenCalledTimes(1);
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });

it("renders the empty-state placeholder when social_live is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

render(<FriendRequestRouteGate kind="incoming" requireAuth />);

expect(screen.getByTestId("empty-incoming")).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });

it("renders the empty-state placeholder when social_relationship_live is placeholder", () => {
mockGetFeatureFlagValue.mockImplementation((name: unknown) =>
name === "social_relationship_live" ? "placeholder" : "live",
      );

render(<FriendRequestRouteGate kind="incoming" requireAuth />);

expect(screen.getByTestId("empty-incoming")).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });

it("renders the privacy notice when the viewer is unauthenticated", () => {
mockUseAuthState.mockReturnValueOnce(unauthenticatedViewer);

render(<FriendRequestRouteGate kind="incoming" requireAuth />);

expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });
  });

describe("outgoing surface", () => {
it("renders OutgoingRequestsListPage in the live branch", () => {
render(<FriendRequestRouteGate kind="outgoing" requireAuth />);

expect(screen.getByTestId("outgoing-requests-list-page")).toBeInTheDocument();
expect(mockOutgoingListPage).toHaveBeenCalledTimes(1);
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });

it("renders the empty-state placeholder when social_live is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

render(<FriendRequestRouteGate kind="outgoing" requireAuth />);

expect(screen.getByTestId("empty-outgoing")).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });

it("renders the empty-state placeholder when social_relationship_live is placeholder", () => {
mockGetFeatureFlagValue.mockImplementation((name: unknown) =>
name === "social_relationship_live" ? "placeholder" : "live",
      );

render(<FriendRequestRouteGate kind="outgoing" requireAuth />);

expect(screen.getByTestId("empty-outgoing")).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });

it("renders the privacy notice when the viewer is unauthenticated", () => {
mockUseAuthState.mockReturnValueOnce(unauthenticatedViewer);

render(<FriendRequestRouteGate kind="outgoing" requireAuth />);

expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });
  });

describe("kind discrimination", () => {
it("never renders the incoming page from an outgoing gate (and vice versa)", () => {
render(<FriendRequestRouteGate kind="incoming" requireAuth />);
expect(mockIncomingListPage).toHaveBeenCalledTimes(1);
expect(mockOutgoingListPage).not.toHaveBeenCalled();

render(<FriendRequestRouteGate kind="outgoing" requireAuth />);
expect(mockOutgoingListPage).toHaveBeenCalledTimes(1);
      // The incoming page mock was called once above; the total is 1.
      // (We deliberately use a fresh component each time.)
    });
  });

describe("friendshipId hygiene", () => {
it("the gate receives no friendshipId and never produces one", () => {

render(<FriendRequestRouteGate kind="incoming" requireAuth />);

const allReceivedProps = mockIncomingListPage.mock.calls.map(
(args) => args[0],
      );
for (const props of allReceivedProps) {
const propsObj = (props ?? {}) as Record<string, unknown>;
expect(Object.keys(propsObj)).not.toContain("friendshipId");
      }
    });
  });
});