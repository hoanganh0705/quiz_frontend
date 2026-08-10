/**
 * `mutual-friends-route.spec.tsx` — Locks the App Router route shell
 * for `/social/users/[id]/mutual-friends`.
 *
 * Source ticket: TKT-6.4.G1 + TKT-6.4.G3.
 *
 * Asserts:
 *
 *   - The route short-circuits to `notFound()` when `:id` is not
 *     a UUID.
 *   - The route delegates to `<MutualsRouteGate kind="friends"
 *     targetUserId={id} />` when `:id` is a UUID.
 *   - The gate's `'placeholder'` and `'live'` branches are exercised
 *     in the co-located `MutualsRouteGate.spec.tsx`; this file
 *     verifies the route shell wires the gate correctly.
 */

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

describe("/social/users/[id]/mutual-friends route shell", () => {
  beforeEach(() => {
    mockMutualsRouteGate.mockClear();
    notFoundMock.mockClear();
  });

  it("is exported as an async default function", async () => {
    const routeModule = await import(
      "@/app/(protected)/social/users/[id]/mutual-friends/page"
    );
    expect(typeof routeModule.default).toBe("function");
  });

  it("delegates to MutualsRouteGate with kind='friends' when :id is a UUID (TKT-6.4.G1)", async () => {
    const MutualFriendsRoute = (await import(
      "@/app/(protected)/social/users/[id]/mutual-friends/page"
    )).default;
    const element = await MutualFriendsRoute({
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
    });
    render(element);
    expect(mockMutualsRouteGate).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "friends",
        targetUserId: "00000000-0000-4000-8000-000000000000",
      }),
    );
    const gate = screen.getByTestId("mutuals-route-gate");
    expect(gate.getAttribute("data-kind")).toBe("friends");
    expect(gate.getAttribute("data-target-user-id")).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
  });

  it("calls notFound() when :id is not a UUID", async () => {
    const MutualFriendsRoute = (await import(
      "@/app/(protected)/social/users/[id]/mutual-friends/page"
    )).default;
    let thrown: unknown = null;
    try {
      await MutualFriendsRoute({ params: Promise.resolve({ id: "not-a-uuid" }) });
    } catch (err) {
      thrown = err;
    }
    expect(notFoundMock).toHaveBeenCalled();
    expect(thrown).toBeInstanceOf(Error);
  });
});