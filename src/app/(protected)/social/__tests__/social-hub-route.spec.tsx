

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