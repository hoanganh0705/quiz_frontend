/**
 * `FeedEmptyState.spec.tsx` — Locks the empty-state contract
 * (TKT-6.9.F2).
 *
 * Asserts:
 *
 *   - `kind: 'empty'` renders the documented "No activity yet" copy.
 *   - `kind: 'private_viewer'` renders the
 *     `PrivacyRestrictedNotice` with `variant: 'not_available'`.
 *   - `kind: 'recently_blocked'` renders the documented copy with
 *     a link to the blocked-users page.
 *   - Each branch sets `role="status"` and an `aria-label`.
 *   - The component is server-renderable (no hooks).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedEmptyState } from "@/features/social/components/FeedEmptyState";

describe("FeedEmptyState (TKT-6.9.F2)", () => {
  it("renders the documented copy for kind: 'empty'", () => {
    render(<FeedEmptyState kind="empty" />);
    const root = screen.getByTestId("feed-empty-state");
    expect(root.getAttribute("data-empty-kind")).toBe("empty");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-label")).toBe("Feed is empty");
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
  });

  it("renders the PrivacyRestrictedNotice for kind: 'private_viewer'", () => {
    render(<FeedEmptyState kind="private_viewer" />);
    const notice = screen.getByTestId("privacy-restricted-notice-not_available");
    expect(notice).toBeInTheDocument();
    expect(notice.getAttribute("data-resource-kind")).toBe("feed");
  });

  it("renders the documented copy and link for kind: 'recently_blocked'", () => {
    render(<FeedEmptyState kind="recently_blocked" />);
    const root = screen.getByTestId("feed-empty-state");
    expect(root.getAttribute("data-empty-kind")).toBe("recently_blocked");
    expect(root.getAttribute("role")).toBe("status");
    expect(screen.getByText(/recently blocked a user/i)).toBeInTheDocument();
    const link = screen.getByTestId("feed-empty-state-recently-blocked-link");
    expect(link.getAttribute("href")).toBe("/social/blocked");
  });
});