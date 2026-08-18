

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialMutualsPlaceholder } from "@/features/social/components/SocialMutualsPlaceholder";

describe("SocialMutualsPlaceholder", () => {
it("renders the documented friends copy", () => {
render(<SocialMutualsPlaceholder kind="friends" targetUserId="user-1" />);
const placeholder = screen.getByTestId("social-mutuals-placeholder-friends");
expect(placeholder).toBeInTheDocument();
expect(placeholder.textContent).toContain("Mutual friends");
expect(placeholder.getAttribute("data-kind")).toBe("friends");
expect(placeholder.getAttribute("data-target-user-id")).toBe("user-1");
  });

it("renders the documented followers copy", () => {
render(<SocialMutualsPlaceholder kind="followers" targetUserId="user-2" />);
const placeholder = screen.getByTestId("social-mutuals-placeholder-followers");
expect(placeholder).toBeInTheDocument();
expect(placeholder.textContent).toContain("Mutual followers");
expect(placeholder.getAttribute("data-kind")).toBe("followers");
  });

it("handles a missing targetUserId without errors", () => {
render(<SocialMutualsPlaceholder kind="friends" />);
const placeholder = screen.getByTestId("social-mutuals-placeholder-friends");
expect(placeholder.getAttribute("data-target-user-id")).toBeNull();
  });
});
