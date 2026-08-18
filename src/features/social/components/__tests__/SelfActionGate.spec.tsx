

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelfActionGate } from "@/features/social/components/SelfActionGate";

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

beforeEach(() => {
mockUseAuthBootstrap.mockReset();
});

describe("SelfActionGate", () => {
it("renders children when the target is someone else", () => {
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-1" },
isAuthenticated: true,
    });
render(
<SelfActionGate targetUserId="user-2">
<button data-testid="cta">Follow</button>
</SelfActionGate>,
    );
expect(screen.getByTestId("cta")).toBeInTheDocument();
  });

it("hides children when the target is the viewer", () => {
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-1" },
isAuthenticated: true,
    });
render(
<SelfActionGate targetUserId="viewer-1">
<button data-testid="cta">Follow</button>
</SelfActionGate>,
    );
expect(screen.queryByTestId("cta")).toBeNull();
  });

it("accepts a custom fallback", () => {
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-1" },
isAuthenticated: true,
    });
render(
<SelfActionGate
targetUserId="viewer-1"
fallback={<span data-testid="fallback">self</span>}
      >
<button data-testid="cta">Follow</button>
</SelfActionGate>,
    );
expect(screen.queryByTestId("cta")).toBeNull();
expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

it("renders children when the auth bootstrap is mid-flight", () => {
mockUseAuthBootstrap.mockReturnValue({
currentUser: null,
isAuthenticated: false,
    });
render(
<SelfActionGate targetUserId="user-2">
<button data-testid="cta">Follow</button>
</SelfActionGate>,
    );
expect(screen.getByTestId("cta")).toBeInTheDocument();
  });
});