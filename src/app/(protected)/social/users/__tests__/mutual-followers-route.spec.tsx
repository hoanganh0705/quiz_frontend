

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockMutualsRouteGate = vi.fn(
({ kind, targetUserId }: { kind: string; targetUserId?: string }) => (
<div
data-testid="mutuals-route-gate"
data-kind={kind}
data-target-user-id={targetUserId ?? ""}
    />
  ),
);

vi.mock("@/features/social/components/MutualsRouteGate", () => ({
MutualsRouteGate: (props: { kind: string; targetUserId?: string }) =>
mockMutualsRouteGate(props),
}));

const notFoundMock = vi.fn(() => {
throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
notFound: () => notFoundMock(),
}));

describe("/social/users/[id]/mutual-followers route shell", () => {
beforeEach(() => {
mockMutualsRouteGate.mockClear();
notFoundMock.mockClear();
  });

it("is exported as an async default function", async () => {
const routeModule = await import(
"@/app/(protected)/social/users/[id]/mutual-followers/page"
    );
expect(typeof routeModule.default).toBe("function");
  });

it("delegates to MutualsRouteGate with kind='followers' when :id is a UUID (TKT-6.4.G1)", async () => {
const MutualFollowersRoute = (await import(
"@/app/(protected)/social/users/[id]/mutual-followers/page"
    )).default;
const element = await MutualFollowersRoute({
params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
    });
render(element);
expect(mockMutualsRouteGate).toHaveBeenCalledWith(
expect.objectContaining({
kind: "followers",
targetUserId: "00000000-0000-4000-8000-000000000000",
      }),
    );
const gate = screen.getByTestId("mutuals-route-gate");
expect(gate.getAttribute("data-kind")).toBe("followers");
expect(gate.getAttribute("data-target-user-id")).toBe(
"00000000-0000-4000-8000-000000000000",
    );
  });

it("calls notFound() when :id is not a UUID", async () => {
const MutualFollowersRoute = (await import(
"@/app/(protected)/social/users/[id]/mutual-followers/page"
    )).default;
let thrown: unknown = null;
try {
await MutualFollowersRoute({ params: Promise.resolve({ id: "not-a-uuid" }) });
    } catch (err) {
thrown = err;
    }
expect(notFoundMock).toHaveBeenCalled();
expect(thrown).toBeInstanceOf(Error);
  });
});