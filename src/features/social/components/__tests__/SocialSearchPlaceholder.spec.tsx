

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialSearchPlaceholder } from "@/features/social/components/SocialSearchPlaceholder";

describe("SocialSearchPlaceholder", () => {
it("renders the coming soon copy", () => {
render(<SocialSearchPlaceholder />);
const placeholder = screen.getByTestId("social-search-placeholder");
expect(placeholder.textContent).toContain("Search coming soon");
expect(placeholder.getAttribute("aria-label")).toBe(
"Social user search (placeholder)",
    );
  });
});
