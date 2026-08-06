/**
 * `activity-route.spec.tsx` — Locks the App Router route shell for
 * `/social/users/[id]/activity`.
 *
 * Source ticket: TKT-6.4.G2 + TKT-6.4.G3.
 *
 * Asserts:
 *
 *   - The route short-circuits to `notFound()` when `:id` is not
 *     a UUID.
 *   - The route delegates to `<ActivityRouteGate targetUserId={id} />`
 *     when `:id` is a UUID.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockActivityRouteGate = vi.fn(
  ({ targetUserId }: { targetUserId?: string }) => (
    <div
      data-testid="activity-route-gate"
      data-target-user-id={targetUserId ?? ""}
    />
  ),
);

vi.mock("@/features/social/components/ActivityRouteGate", () => ({
  ActivityRouteGate: (props: { targetUserId?: string }) =>
    mockActivityRouteGate(props),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

describe("/social/users/[id]/activity route shell", () => {
  beforeEach(() => {
    mockActivityRouteGate.mockClear();
    notFoundMock.mockClear();
  });

  it("is exported as an async default function", async () => {
    const routeModule = await import(
      "@/app/social/users/[id]/activity/page"
    );
    expect(typeof routeModule.default).toBe("function");
  });

  it("delegates to ActivityRouteGate with the target user id when :id is a UUID (TKT-6.4.G2)", async () => {
    const UserActivityRoute = (await import(
      "@/app/social/users/[id]/activity/page"
    )).default;
    const element = await UserActivityRoute({
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
    });
    render(element);
    expect(mockActivityRouteGate).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: "00000000-0000-4000-8000-000000000000",
      }),
    );
    const gate = screen.getByTestId("activity-route-gate");
    expect(gate.getAttribute("data-target-user-id")).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
  });

  it("calls notFound() when :id is not a UUID", async () => {
    const UserActivityRoute = (await import(
      "@/app/social/users/[id]/activity/page"
    )).default;
    let thrown: unknown = null;
    try {
      await UserActivityRoute({ params: Promise.resolve({ id: "not-a-uuid" }) });
    } catch (err) {
      thrown = err;
    }
    expect(notFoundMock).toHaveBeenCalled();
    expect(thrown).toBeInstanceOf(Error);
  });
});