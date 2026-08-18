

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialHubPlaceholder } from "@/features/social/components/SocialHubPlaceholder";

describe("SocialHubPlaceholder", () => {
it("renders the documented greeting without a viewer display name", () => {
render(<SocialHubPlaceholder />);
const root = screen.getByTestId("social-hub-placeholder");
expect(root.textContent).toMatch(/Welcome back/);
expect(root.textContent).toMatch(
/Your social counts, my analytics, and the friend leaderboard/,
    );
  });

it("renders the personalised greeting when a viewer display name is supplied", () => {
render(<SocialHubPlaceholder viewerDisplayName="Anh" />);
const root = screen.getByTestId("social-hub-placeholder");
expect(root.textContent).toMatch(/Welcome back, Anh/);
  });

it("carries the documented aria-label", () => {
render(<SocialHubPlaceholder />);
const root = screen.getByTestId("social-hub-placeholder");
expect(root.getAttribute("aria-label")).toBe("Social Hub (placeholder)");
  });
});