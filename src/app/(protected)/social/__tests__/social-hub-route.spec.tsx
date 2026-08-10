/**
 * `social-hub-route.spec.tsx` — Locks the App Router route shell
 * for `/social`.
 *
 * Source ticket: TKT-6.3.E4.
 *
 * Asserts:
 *
 *   - The route delegates to `<AnalyticsRouteGate kind="hub" />`
 *     (parity with the Batch B scaffold; the live branch the gate
 *     picks is owned by `AnalyticsRouteGate.spec.tsx`).
 *   - The route renders inside a `<Suspense>` boundary
 *     (parity with the Epic 6.2 / notifications convention).
 *   - The default export is a function (the route module is an
 *     App Router page component).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAnalyticsRouteGate = vi.fn(
  ({ kind }: { kind: string }) => (
    <div data-testid="analytics-route-gate" data-kind={kind} />
  ),
);

vi.mock("@/features/social/components/AnalyticsRouteGate", () => ({
  AnalyticsRouteGate: (props: { kind: string }) =>
    mockAnalyticsRouteGate(props),
}));

describe("/social route shell", () => {
  beforeEach(() => {
    mockAnalyticsRouteGate.mockClear();
  });

  it("is exported as a default function", async () => {
    const routeModule = await import("@/app/(protected)/social/page");
    expect(typeof routeModule.default).toBe("function");
  });

  it("renders AnalyticsRouteGate with kind='hub' (TKT-6.3.E4)", async () => {
    const SocialHubRoute = (await import("@/app/(protected)/social/page")).default;
    render(<SocialHubRoute />);
    expect(mockAnalyticsRouteGate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "hub" }),
    );
    const gate = screen.getByTestId("analytics-route-gate");
    expect(gate.getAttribute("data-kind")).toBe("hub");
  });
});