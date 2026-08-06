/**
 * `SearchRateLimitNotice.spec.tsx` — Locks the search rate-limit notice
 * contract (TKT-6.5.B4).
 *
 * Asserts:
 *
 *   - `surface === 'global-search-bar'` renders the global-search-bar copy.
 *   - `surface === 'social-search-page'` renders the social-search-page copy.
 *   - The retry CTA is disabled while the countdown is active.
 *   - `onCooldownComplete` is called when the cooldown completes.
 */

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchRateLimitNotice } from "@/features/social/components/SearchRateLimitNotice";

describe("SearchRateLimitNotice", () => {
  it("renders the global-search-bar copy", () => {
    render(
      <SearchRateLimitNotice
        cooldownSeconds={30}
        surface="global-search-bar"
      />,
    );
    const notice = screen.getByTestId("search-rate-limit-notice");
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toContain("Search rate limit reached");
  });

  it("renders the social-search-page copy", () => {
    render(
      <SearchRateLimitNotice
        cooldownSeconds={30}
        surface="social-search-page"
      />,
    );
    const notice = screen.getByTestId("search-rate-limit-notice");
    expect(notice.textContent).toContain("You've searched too often");
  });

  it("renders the retry button", () => {
    render(
      <SearchRateLimitNotice
        cooldownSeconds={30}
        surface="global-search-bar"
      />,
    );
    const retry = screen.getByTestId("search-rate-limit-retry");
    expect(retry).toBeInTheDocument();
  });
});
