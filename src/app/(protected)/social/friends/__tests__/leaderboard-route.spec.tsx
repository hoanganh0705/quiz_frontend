/**
 * `leaderboard-route.spec.tsx` — Locks the App Router route shell
 * for `/social/friends/leaderboard`.
 *
 * Source ticket: TKT-6.3.G3.
 *
 * Asserts:
 *
 *   - The route delegates to `<AnalyticsRouteGate kind="leaderboard"
 *     requireAuth />`.
 *   - The default export is a function (the route module is an
 *     App Router page component).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAnalyticsRouteGate = vi.fn(
  ({ kind, requireAuth }: { kind: string; requireAuth?: boolean }) => (
    <div
      data-testid="analytics-route-gate"
      data-kind={kind}
      data-require-auth={requireAuth ? "true" : "false"}
    />
  ),
);

vi.mock("@/features/social/components/AnalyticsRouteGate", () => ({
  AnalyticsRouteGate: (props: { kind: string; requireAuth?: boolean }) =>
    mockAnalyticsRouteGate(props),
}));

describe("/social/friends/leaderboard route shell", () => {
  beforeEach(() => {
    mockAnalyticsRouteGate.mockClear();
  });

  it("is exported as a default function", async () => {
    const routeModule = await import(
      "@/app/(protected)/social/friends/leaderboard/page"
    );
    expect(typeof routeModule.default).toBe("function");
  });

  it("delegates to AnalyticsRouteGate with kind='leaderboard' and requireAuth (TKT-6.3.G3)", async () => {
    const FriendLeaderboardRoute = (await import(
      "@/app/(protected)/social/friends/leaderboard/page"
    )).default;
    render(<FriendLeaderboardRoute />);
    expect(mockAnalyticsRouteGate).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "leaderboard",
        requireAuth: true,
      }),
    );
    const gate = screen.getByTestId("analytics-route-gate");
    expect(gate.getAttribute("data-kind")).toBe("leaderboard");
    expect(gate.getAttribute("data-require-auth")).toBe("true");
  });
});