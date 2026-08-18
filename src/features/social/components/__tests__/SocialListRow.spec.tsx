

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialListRow } from "@/features/social/components/SocialListRow";
import * as analytics from "@/features/social/utils/social-list-analytics";
import type {
SocialBlockedUserDto,
SocialUserSummaryDto,
} from "@/features/social/types";

const summaryUser: SocialUserSummaryDto = {
id: "summary-1",
userId: "11111111-1111-1111-1111-111111111111",
userName: "alice",
displayName: "Alice A.",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
};

const blockedUser: SocialBlockedUserDto = {
id: "blocked-1",
userId: "11111111-1111-1111-1111-111111111111",
user: summaryUser,
since: "2026-01-02T00:00:00.000Z",
};

const trackSpy = vi.spyOn(analytics, "trackSocialListRowTapped");

afterEach(() => {
trackSpy.mockClear();
});

describe("SocialListRow", () => {
it("renders a link whose href contains only the userId", () => {
render(<SocialListRow user={summaryUser} variant="summary" />);
const link = screen.getByTestId("social-list-row-summary");
expect(link.tagName.toLowerCase()).toBe("a");
expect(link.getAttribute("href")).toBe(
`/users/${encodeURIComponent(summaryUser.userId)}`,
    );

const href = link.getAttribute("href") ?? "";
expect(href).not.toMatch(/followId|friendshipId|blockId|offset/);
  });

it("emits an analytics payload containing only userId + variant", () => {
const onNavigate = vi.fn();
render(
<SocialListRow
user={summaryUser}
variant="summary"
onNavigate={onNavigate}
      />,
    );
const link = screen.getByTestId("social-list-row-summary");
link.click();
expect(trackSpy).toHaveBeenCalledWith({
userId: summaryUser.userId,
variant: "summary",
    });

const payload = trackSpy.mock.calls[0]?.[0] as unknown as Record<
string,
unknown
    >;
expect(payload).not.toHaveProperty("followId");
expect(payload).not.toHaveProperty("friendshipId");
expect(payload).not.toHaveProperty("blockId");
expect(onNavigate).toHaveBeenCalledWith(summaryUser.userId);
  });

it("renders the blocked variant without action CTAs", () => {
render(<SocialListRow user={blockedUser} variant="blocked" />);
const link = screen.getByTestId("social-list-row-blocked");
expect(link).toBeInTheDocument();

expect(link.querySelector("button")).toBeNull();
  });

it("unwraps SocialBlockedUserDto into the nested summary", () => {
render(<SocialListRow user={blockedUser} variant="blocked" />);
const link = screen.getByTestId("social-list-row-blocked");
expect(link.getAttribute("href")).toBe(
`/users/${encodeURIComponent(blockedUser.user.userId)}`,
    );
expect(link.getAttribute("data-user-id")).toBe(blockedUser.user.userId);
  });
});