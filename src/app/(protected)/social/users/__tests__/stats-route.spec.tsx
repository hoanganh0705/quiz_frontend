

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAnalyticsRouteGate = vi.fn(
({ kind, targetUserId }: { kind: string; targetUserId?: string }) => (
<div
data-testid="analytics-route-gate"
data-kind={kind}
data-target-user-id={targetUserId ?? ""}
    />
  ),
);

vi.mock("@/features/social/components/AnalyticsRouteGate", () => ({
AnalyticsRouteGate: (props: { kind: string; targetUserId?: string }) =>
mockAnalyticsRouteGate(props),
}));

const notFoundMock = vi.fn(() => {

throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
notFound: () => notFoundMock(),
}));

describe("/social/users/[id]/stats route shell", () => {
beforeEach(() => {
mockAnalyticsRouteGate.mockClear();
notFoundMock.mockClear();
  });

it("is exported as an async default function", async () => {
const routeModule = await import(
"@/app/(protected)/social/users/[id]/stats/page"
    );
expect(typeof routeModule.default).toBe("function");
  });

it("delegates to AnalyticsRouteGate with kind='stats' when :id is a UUID (TKT-6.3.E4)", async () => {
const UserStatsRoute = (await import(
"@/app/(protected)/social/users/[id]/stats/page"
    )).default;
const element = await UserStatsRoute({
params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
    });
render(element);
expect(mockAnalyticsRouteGate).toHaveBeenCalledWith(
expect.objectContaining({
kind: "stats",
targetUserId: "00000000-0000-4000-8000-000000000000",
      }),
    );
const gate = screen.getByTestId("analytics-route-gate");
expect(gate.getAttribute("data-kind")).toBe("stats");
expect(gate.getAttribute("data-target-user-id")).toBe(
"00000000-0000-4000-8000-000000000000",
    );
  });

it("calls notFound() when :id is not a UUID", async () => {
const UserStatsRoute = (await import(
"@/app/(protected)/social/users/[id]/stats/page"
    )).default;
let thrown: unknown = null;
try {
await UserStatsRoute({ params: Promise.resolve({ id: "not-a-uuid" }) });
    } catch (err) {
thrown = err;
    }
expect(notFoundMock).toHaveBeenCalled();
expect(thrown).toBeInstanceOf(Error);
  });
});