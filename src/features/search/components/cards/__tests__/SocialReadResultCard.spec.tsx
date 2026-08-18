

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SocialReadResultCard } from "@/features/search/components/cards/SearchResultCards";
import type { SocialReadResultDto } from "@/features/search/types/search.types";

describe("SocialReadResultCard", () => {
const baseItem: SocialReadResultDto = {
id: "user-123",
displayName: "Jane Doe",
subtitle: "Quiz enthusiast",
href: "/profile/user-123",
visibility: "public",
  };

describe("rendering", () => {
it("renders the display name as a link", () => {
render(<SocialReadResultCard item={baseItem} />);

const link = screen.getByRole("link", { name: /jane doe/i });
expect(link).toHaveAttribute("href", "/profile/user-123");
    });

it("renders the subtitle when present", () => {
render(<SocialReadResultCard item={baseItem} />);

expect(screen.getByText("Quiz enthusiast")).toBeInTheDocument();
    });

it("does not render the subtitle when absent", () => {
const noSubtitle: SocialReadResultDto = {
...baseItem,
subtitle: undefined,
      };
render(<SocialReadResultCard item={noSubtitle} />);

expect(screen.queryByText("Quiz enthusiast")).not.toBeInTheDocument();
    });
  });

describe("no social write CTAs invariant (TKT-5.6.G2 AC #3)", () => {
it("does not render a follow button", () => {
render(<SocialReadResultCard item={baseItem} />);

expect(screen.queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
    });

it("does not render a friend-request button", () => {
render(<SocialReadResultCard item={baseItem} />);

expect(screen.queryByRole("button", { name: /add friend/i })).not.toBeInTheDocument();
    });

it("does not render a message button", () => {
render(<SocialReadResultCard item={baseItem} />);

expect(screen.queryByRole("button", { name: /message/i })).not.toBeInTheDocument();
    });

it("renders only one link (the result navigation)", () => {
render(<SocialReadResultCard item={baseItem} />);

const links = screen.getAllByRole("link");
expect(links).toHaveLength(1);
expect(links[0]).toHaveAttribute("href", "/profile/user-123");
    });
  });

describe("stable-ID navigation invariant (TKT-5.6.G2 AC #2)", () => {
it("uses the stable public ID in the href", () => {
render(<SocialReadResultCard item={baseItem} />);

const link = screen.getByRole("link");
expect(link).toHaveAttribute("href", "/profile/user-123");
expect(link.getAttribute("href")).not.toContain("followId");
expect(link.getAttribute("href")).not.toContain("friendshipId");
    });

it("navigates using only stable identifiers", () => {
const withStableId: SocialReadResultDto = {
...baseItem,
id: "stable-public-id",
href: "/profile/stable-public-id",
      };
render(<SocialReadResultCard item={withStableId} />);

const link = screen.getByRole("link");
expect(link).toHaveAttribute("href", "/profile/stable-public-id");
    });
  });
});
