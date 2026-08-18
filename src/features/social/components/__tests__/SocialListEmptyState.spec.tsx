

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialListEmptyState } from "@/features/social/components/SocialListEmptyState";

describe("SocialListEmptyState", () => {
it("renders the followers copy for owner viewers", () => {
render(<SocialListEmptyState kind="followers" viewerIsOwner />);
const root = screen.getByTestId("social-list-empty-state-followers");
expect(root.textContent).toMatch(/No followers yet/);
expect(root.textContent).toMatch(/When people follow you/);
expect(root.getAttribute("data-viewer-is-owner")).toBe("true");
  });

it("renders the followers copy for non-owner viewers", () => {
render(<SocialListEmptyState kind="followers" viewerIsOwner={false} />);
const root = screen.getByTestId("social-list-empty-state-followers");
expect(root.textContent).toMatch(/No followers yet/);
expect(root.textContent).toMatch(/This user doesn/);
expect(root.getAttribute("data-viewer-is-owner")).toBe("false");
  });

it("renders the following copy", () => {
render(<SocialListEmptyState kind="following" viewerIsOwner={false} />);
expect(
screen.getByTestId("social-list-empty-state-following").textContent,
    ).toMatch(/Not following anyone yet/);
  });

it("renders the friends copy", () => {
render(<SocialListEmptyState kind="friends" viewerIsOwner={false} />);
expect(
screen.getByTestId("social-list-empty-state-friends").textContent,
    ).toMatch(/No friends yet/);
  });

it("renders the blocked copy", () => {
render(<SocialListEmptyState kind="blocked" viewerIsOwner />);
expect(
screen.getByTestId("social-list-empty-state-blocked").textContent,
    ).toMatch(/No blocked users/);
  });

it("uses role=status for live-region semantics", () => {
render(<SocialListEmptyState kind="following" viewerIsOwner={false} />);
expect(
screen.getByTestId("social-list-empty-state-following").getAttribute(
"role",
      ),
    ).toBe("status");
  });
});