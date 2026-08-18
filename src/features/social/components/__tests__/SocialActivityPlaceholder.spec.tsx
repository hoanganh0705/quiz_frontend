

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialActivityPlaceholder } from "@/features/social/components/SocialActivityPlaceholder";

describe("SocialActivityPlaceholder", () => {
it("renders the documented 'Activity' copy", () => {
render(<SocialActivityPlaceholder targetUserId="user-1" />);
const placeholder = screen.getByTestId("social-activity-placeholder");
expect(placeholder).toBeInTheDocument();
expect(placeholder.textContent).toContain("Activity");
expect(placeholder.getAttribute("data-target-user-id")).toBe("user-1");
  });

it("handles a missing targetUserId without errors", () => {
render(<SocialActivityPlaceholder />);
const placeholder = screen.getByTestId("social-activity-placeholder");
expect(placeholder.getAttribute("data-target-user-id")).toBeNull();
  });
});
