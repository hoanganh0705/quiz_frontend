

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SearchResultGroup } from "@/features/search/components/SearchResultGroup";
import type {
QuizResultDto,
SearchGroup,
UserResultDto,
} from "@/features/search/types/search.types";

describe("SearchResultGroup", () => {
describe("rendering", () => {
it("renders all visible items", () => {
const group: SearchGroup<QuizResultDto> = {
kind: "quiz",
items: [
{
id: "q1",
title: "Quiz One",
slug: "quiz-one",
displayName: "Quiz One",
subtitle: "10 questions",
href: "/quizzes/q1",
visibility: "public",
          },
{
id: "q2",
title: "Quiz Two",
slug: "quiz-two",
displayName: "Quiz Two",
subtitle: "20 questions",
href: "/quizzes/q2",
visibility: "public",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => <span key={item.id}>{item.displayName}</span>}
        />,
      );

expect(screen.getByText("Quiz One")).toBeInTheDocument();
expect(screen.getByText("Quiz Two")).toBeInTheDocument();
    });

it("renders the footer when provided (TKT-5.6.G2 AC #3)", () => {
const group: SearchGroup<QuizResultDto> = {
kind: "quiz",
items: [
{
id: "q1",
title: "Quiz One",
slug: "quiz-one",
displayName: "Quiz One",
subtitle: "10 questions",
href: "/quizzes/q1",
visibility: "public",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={() => null}
footer={<button>Load more</button>}
        />,
      );

expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
    });
  });

describe("privacy filtering (TKT-5.6.G2 AC #2)", () => {
it("renders public items", () => {
const group: SearchGroup<UserResultDto> = {
kind: "user",
items: [
{
id: "u1",
username: "alice",
displayName: "Alice",
subtitle: "100 quizzes",
href: "/profile/alice",
visibility: "public",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => <span key={item.id}>{item.displayName}</span>}
        />,
      );

expect(screen.getByText("Alice")).toBeInTheDocument();
    });

it("filters out private items for anonymous users (TKT-5.6.G2 AC #2)", () => {
const group: SearchGroup<UserResultDto> = {
kind: "user",
items: [
{
id: "u1",
username: "publicuser",
displayName: "Public User",
subtitle: "public profile",
href: "/profile/publicuser",
visibility: "public",
          },
{
id: "u2",
username: "privateuser",
displayName: "Private User",
subtitle: "private profile",
href: "/profile/privateuser",
visibility: "private",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => <span key={item.id}>{item.displayName}</span>}
        />,
      );

expect(screen.getByText("Public User")).toBeInTheDocument();
expect(screen.queryByText("Private User")).not.toBeInTheDocument();
    });

it("shows authenticated-only hint when authenticated items are filtered for anonymous viewers (TKT-5.6.G2 AC #2)", () => {
const group: SearchGroup<UserResultDto> = {
kind: "user",
items: [
{
id: "u1",
username: "authonly",
displayName: "Auth Only User",
subtitle: "authentication required",
href: "/profile/authonly",
visibility: "authenticated",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => <span key={item.id}>{item.displayName}</span>}
          // isAuthenticated defaults to false → viewer is anonymous
        />,
      );

expect(screen.queryByText("Auth Only User")).not.toBeInTheDocument();
expect(
screen.getByRole("link", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

it("renders 'no-results-in-group' empty state when all items are filtered", () => {
const group: SearchGroup<UserResultDto> = {
kind: "user",
items: [
{
id: "u1",
username: "p",
displayName: "Private",
subtitle: "",
href: "/profile/p",
visibility: "private",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => <span key={item.id}>{item.displayName}</span>}
        />,
      );

expect(screen.getByText(/no matches in this category/i)).toBeInTheDocument();
    });
  });

describe("stable-ID navigation invariant (TKT-5.6.G2 AC #2)", () => {
it("renders links with stable public IDs", () => {
const group: SearchGroup<UserResultDto> = {
kind: "user",
items: [
{
id: "stable-id",
username: "stableuser",
displayName: "Stable User",
subtitle: "",
href: "/profile/stable-id",
visibility: "public",
          },
        ],
visibility: "public",
      };

render(
<SearchResultGroup
group={group}
renderItem={(item) => (
<a key={item.id} href={item.href}>
{item.displayName}
</a>
          )}
        />,
      );

const link = screen.getByRole("link");
expect(link).toHaveAttribute("href", "/profile/stable-id");
expect(link.getAttribute("href")).not.toContain("followId");
expect(link.getAttribute("href")).not.toContain("friendshipId");
    });
  });
});