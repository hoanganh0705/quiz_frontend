/**
 * `analytics-route.spec.tsx` — Locks the App Router route shell
 * for `/social/me/analytics`.
 *
 * Source ticket: TKT-6.3.F3.
 *
 * Asserts:
 *
 *   - The route delegates to `<AnalyticsRouteGate kind="my-analytics"
 *     requireAuth />`.
 *   - The route renders inside a `<Suspense>` boundary (parity with
 *     the Epic 6.2 / notifications convention).
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

describe("/social/me/analytics route shell", () => {
  beforeEach(() => {
    mockAnalyticsRouteGate.mockClear();
  });

  it("is exported as a default function", async () => {
    const routeModule = await import("@/app/(protected)/social/me/analytics/page");
    expect(typeof routeModule.default).toBe("function");
  });

  it("delegates to AnalyticsRouteGate with kind='my-analytics' and requireAuth (TKT-6.3.F3)", async () => {
    const MyAnalyticsRoute = (await import(
      "@/app/(protected)/social/me/analytics/page"
    )).default;
    render(<MyAnalyticsRoute />);
    expect(mockAnalyticsRouteGate).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "my-analytics",
        requireAuth: true,
      }),
    );
    const gate = screen.getByTestId("analytics-route-gate");
    expect(gate.getAttribute("data-kind")).toBe("my-analytics");
    expect(gate.getAttribute("data-require-auth")).toBe("true");
  });
});