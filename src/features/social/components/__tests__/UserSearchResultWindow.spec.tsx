

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserSearchResultWindow } from "@/features/social/components/UserSearchResultWindow";
import type { SocialUserSummaryDto } from "@/features/social/types";

const mockUsers: SocialUserSummaryDto[] = Array.from({ length: 5 }, (_, i) => ({
userId: `user-${i}`,
userName: `user${i}`,
displayName: `User ${i}`,
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
}));

const mockRow = vi.fn(({ user, index }: { user: SocialUserSummaryDto; index: number }) => (
<div data-testid="mock-row" data-user-id={user.userId} data-index={index}>
{user.userName} - {index}
</div>
));

beforeEach(() => {
mockRow.mockClear();
});

describe("UserSearchResultWindow", () => {
describe("below-threshold rendering", () => {
it("renders all items without virtualization when below threshold", () => {
render(
<UserSearchResultWindow
items={mockUsers.slice(0, 3)}
threshold={40}
row={mockRow}
        />,
      );

expect(screen.getAllByTestId("mock-row")).toHaveLength(3);
expect(screen.getByTestId("user-search-result-window")).toHaveAttribute(
"data-mode",
"plain",
      );
    });

it("passes correct user and index to row for each item", () => {
render(
<UserSearchResultWindow
items={mockUsers.slice(0, 3)}
threshold={40}
row={mockRow}
        />,
      );

expect(mockRow).toHaveBeenNthCalledWith(1, {
user: mockUsers[0],
index: 0,
      });
expect(mockRow).toHaveBeenNthCalledWith(2, {
user: mockUsers[1],
index: 1,
      });
expect(mockRow).toHaveBeenNthCalledWith(3, {
user: mockUsers[2],
index: 2,
      });
    });
  });

describe("virtualized rendering", () => {
it("applies virtualization when at threshold", () => {
render(
<UserSearchResultWindow
items={mockUsers}
threshold={5}
row={mockRow}
        />,
      );

expect(screen.getByTestId("user-search-result-window")).toHaveAttribute(
"data-mode",
"virtualized",
      );
    });

it("applies virtualization when above threshold", () => {
render(
<UserSearchResultWindow
items={mockUsers}
threshold={3}
row={mockRow}
        />,
      );

expect(screen.getByTestId("user-search-result-window")).toHaveAttribute(
"data-mode",
"virtualized",
      );
    });

it("renders a subset of items in virtualized mode", () => {
const manyUsers = Array.from({ length: 50 }, (_, i) => ({
userId: `user-${i}`,
userName: `user${i}`,
displayName: `User ${i}`,
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
      }));

render(
<UserSearchResultWindow
items={manyUsers}
threshold={10}
row={mockRow}
        />,
      );

const renderedRows = screen.getAllByTestId("mock-row");
expect(renderedRows.length).toBeLessThan(50);
    });
  });

describe("row delegate", () => {
it("receives user and index for each rendered row", () => {
render(
<UserSearchResultWindow
items={mockUsers.slice(0, 2)}
threshold={40}
row={mockRow}
        />,
      );

expect(mockRow.mock.calls.length).toBeGreaterThanOrEqual(2);
expect(mockRow).toHaveBeenCalledWith({
user: mockUsers[0],
index: 0,
      });
expect(mockRow).toHaveBeenCalledWith({
user: mockUsers[1],
index: 1,
      });
    });

it("uses default threshold when not provided", () => {
render(
<UserSearchResultWindow
items={mockUsers.slice(0, 3)}
row={mockRow}
        />,
      );

expect(screen.getByTestId("user-search-result-window")).toHaveAttribute(
"data-mode",
"plain",
      );
    });
  });

describe("empty items", () => {
it("renders nothing when items array is empty", () => {
render(
<UserSearchResultWindow
items={[]}
threshold={40}
row={mockRow}
        />,
      );

expect(screen.queryAllByTestId("mock-row")).toHaveLength(0);
expect(screen.getByTestId("user-search-result-window")).toHaveAttribute(
"data-mode",
"plain",
      );
    });
  });
});
