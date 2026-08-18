

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
