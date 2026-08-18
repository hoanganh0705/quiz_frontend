

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IncomingFriendRequestsRoute from "@/app/(protected)/social/friend-requests/incoming/page";
import OutgoingFriendRequestsRoute from "@/app/(protected)/social/friend-requests/outgoing/page";

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

const mockFriendRequestEmptyState = vi.fn(
({ kind }: { kind: string }) => (
<div data-testid={`friend-request-empty-state-${kind}`}>
Empty {kind}
</div>
  ),
);
vi.mock("@/features/social/components/FriendRequestEmptyState", () => ({
FriendRequestEmptyState: (props: { kind: string }) =>
mockFriendRequestEmptyState(props),
}));

const mockPrivacyNotice = vi.fn(() => (
<div data-testid="privacy-restricted-notice">Privacy</div>
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

describe("IncomingFriendRequestsRoute", () => {
describe("live branch", () => {
it("renders IncomingRequestsListPage when flags are live and viewer is authenticated", () => {
render(<IncomingFriendRequestsRoute />);

expect(screen.getByTestId("incoming-requests-list-page")).toBeInTheDocument();
expect(mockIncomingListPage).toHaveBeenCalledTimes(1);
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });
  });

describe("placeholder branch", () => {
it("renders FriendRequestEmptyState when social_live is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

render(<IncomingFriendRequestsRoute />);

expect(
screen.getByTestId("friend-request-empty-state-incoming"),
      ).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });

it("renders FriendRequestEmptyState when social_relationship_live is placeholder", () => {
mockGetFeatureFlagValue.mockImplementation((name: unknown) => {
if (name === "social_relationship_live") return "placeholder";
return "live";
      });

render(<IncomingFriendRequestsRoute />);

expect(
screen.getByTestId("friend-request-empty-state-incoming"),
      ).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });
  });

describe("auth handling", () => {
it("renders PrivacyRestrictedNotice when viewer is unauthenticated", () => {
mockUseAuthState.mockReturnValueOnce(unauthenticatedViewer);

render(<IncomingFriendRequestsRoute />);

expect(screen.getByTestId("privacy-restricted-notice")).toBeInTheDocument();
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });
  });
});

describe("OutgoingFriendRequestsRoute", () => {
describe("live branch", () => {
it("renders OutgoingRequestsListPage when flags are live and viewer is authenticated", () => {
render(<OutgoingFriendRequestsRoute />);

expect(screen.getByTestId("outgoing-requests-list-page")).toBeInTheDocument();
expect(mockOutgoingListPage).toHaveBeenCalledTimes(1);
expect(mockIncomingListPage).not.toHaveBeenCalled();
    });
  });

describe("placeholder branch", () => {
it("renders FriendRequestEmptyState when social_live is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

render(<OutgoingFriendRequestsRoute />);

expect(
screen.getByTestId("friend-request-empty-state-outgoing"),
      ).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });

it("renders FriendRequestEmptyState when social_relationship_live is placeholder", () => {
mockGetFeatureFlagValue.mockImplementation((name: unknown) => {
if (name === "social_relationship_live") return "placeholder";
return "live";
      });

render(<OutgoingFriendRequestsRoute />);

expect(
screen.getByTestId("friend-request-empty-state-outgoing"),
      ).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });
  });

describe("auth handling", () => {
it("renders PrivacyRestrictedNotice when viewer is unauthenticated", () => {
mockUseAuthState.mockReturnValueOnce(unauthenticatedViewer);

render(<OutgoingFriendRequestsRoute />);

expect(screen.getByTestId("privacy-restricted-notice")).toBeInTheDocument();
expect(mockOutgoingListPage).not.toHaveBeenCalled();
    });
  });
});