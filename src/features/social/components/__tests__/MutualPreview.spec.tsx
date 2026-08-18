

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MutualPreview } from "@/features/social/components/MutualPreview";
import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";
import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

function makeUser(idx: number): SocialUserSummaryDto {
return {
id: `summary-${idx}`,
userId: `user-${idx}`,
userName: `user${idx}`,
displayName: `User ${idx}`,
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const SAMPLE_MUTUALS: SocialUserSummaryDto[] = [
makeUser(1),
makeUser(2),
makeUser(3),
];

describe("MutualPreview — privacy branch", () => {
it("renders PrivacyRestrictedNotice when visibility is 'not_available'", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="not_available"
mutuals={SAMPLE_MUTUALS}
total={3}
      />,
    );
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-avatar")).toBeNull();
  });

it("renders PrivacyRestrictedNotice when visibility is 'friends_only'", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="followers"
visibility="friends_only"
mutuals={SAMPLE_MUTUALS}
total={3}
      />,
    );
expect(screen.getByTestId("privacy-restricted-notice-friends_only")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-avatar")).toBeNull();
  });

it("renders PrivacyRestrictedNotice when visibility is 'auth_required'", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="auth_required"
mutuals={SAMPLE_MUTUALS}
total={3}
      />,
    );
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });

it("renders PrivacyRestrictedNotice when visibility is 'loading' (safe default)", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="loading"
mutuals={SAMPLE_MUTUALS}
total={3}
      />,
    );
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });
});

describe("MutualPreview — empty branch", () => {
it("renders the documented empty copy for friends", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={[]}
total={0}
      />,
    );
const empty = screen.getByTestId("mutual-preview-friends-empty");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual friends");
  });

it("renders the documented empty copy for followers", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="followers"
visibility="visible"
mutuals={[]}
total={0}
      />,
    );
const empty = screen.getByTestId("mutual-preview-followers-empty");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual followers");
  });
});

describe("MutualPreview — populated branch", () => {
it("renders up to MUTUAL_PREVIEW_CAP avatars", () => {
const many = Array.from({ length: MUTUAL_PREVIEW_CAP + 4 }, (_, i) => makeUser(i + 1));
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={many}
total={many.length}
      />,
    );
const avatars = screen.getAllByTestId("mutual-preview-avatar");
expect(avatars.length).toBe(MUTUAL_PREVIEW_CAP);
  });

it("renders the overflow indicator with the helper-derived count", () => {
const many = Array.from({ length: 12 }, (_, i) => makeUser(i + 1));
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={many}
total={18}
      />,
    );
const overflow = screen.getByTestId("mutual-preview-overflow");

expect(overflow.getAttribute("data-overflow")).toBe("12");
expect(overflow.textContent).toContain("+12 more");
  });

it("does not render the overflow indicator when total === visible", () => {
const many = Array.from({ length: 6 }, (_, i) => makeUser(i + 1));
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={many}
total={6}
      />,
    );
expect(screen.queryByTestId("mutual-preview-overflow")).toBeNull();
  });

it("hides the overflow indicator when total is omitted", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={SAMPLE_MUTUALS}
      />,
    );
expect(screen.queryByTestId("mutual-preview-overflow")).toBeNull();
  });

it("avatar link href contains only userId (no internal-id leakage)", () => {
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={SAMPLE_MUTUALS}
total={3}
      />,
    );
const avatars = screen.getAllByTestId("mutual-preview-avatar");
for (const avatar of avatars) {
const href = avatar.getAttribute("href") ?? "";
expect(href).toMatch(/^\/users\/user-[123]$/);
expect(href).not.toMatch(/followId|friendshipId|blockId|offset/);
    }
  });

it("clamps the overflow to the hard cap", () => {
const many = Array.from({ length: 6 }, (_, i) => makeUser(i + 1));
render(
<MutualPreview
targetUserId="user-x"
variant="friends"
visibility="visible"
mutuals={many}
total={999}
      />,
    );
const overflow = screen.getByTestId("mutual-preview-overflow");

expect(overflow.getAttribute("data-overflow")).toBe("494");
  });
});
