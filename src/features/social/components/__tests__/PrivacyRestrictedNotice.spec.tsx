

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import * as analytics from "@/features/social/utils/social-list-analytics";

const trackSpy = vi.spyOn(analytics, "trackSocialListRowTapped");

afterEach(() => {
trackSpy.mockClear();
});

describe("PrivacyRestrictedNotice", () => {
it("renders the not_available variant", () => {
render(
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="friends"
      />,
    );
const root = screen.getByTestId("privacy-restricted-notice-not_available");
expect(root.textContent).toMatch(/Not available/);
expect(root.textContent).toMatch(/This information isn't available right now/);
expect(root.getAttribute("data-resource-kind")).toBe("friends");
  });

it("renders the friends_only variant", () => {
render(
<PrivacyRestrictedNotice
variant="friends_only"
resourceKind="friends"
      />,
    );
const root = screen.getByTestId("privacy-restricted-notice-friends_only");
expect(root.textContent).toMatch(/For friends only/);
expect(root.textContent).toMatch(/Only the user and their friends can see this/);
expect(root.getAttribute("data-resource-kind")).toBe("friends");
  });

it("does not emit an analytics payload on mount", () => {
render(
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />,
    );
expect(trackSpy).not.toHaveBeenCalled();
  });

it("uses role=status for live-region semantics", () => {
render(
<PrivacyRestrictedNotice
variant="friends_only"
resourceKind="friends"
      />,
    );
expect(
screen.getByTestId("privacy-restricted-notice-friends_only").getAttribute(
"role",
      ),
    ).toBe("status");
  });

it("never leaks any internal id into the DOM", () => {
const { container } = render(
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />,
    );
const html = container.innerHTML;
expect(html).not.toMatch(/followId/);
expect(html).not.toMatch(/friendshipId/);
expect(html).not.toMatch(/blockId/);
  });
});