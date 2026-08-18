

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeedLoadMore } from "@/features/social/components/FeedLoadMore";

describe("FeedLoadMore (TKT-6.9.F6)", () => {
it("renders null when hasMore is false", () => {
const { container } = render(
<FeedLoadMore
hasMore={false}
isLoadingMore={false}
onLoadMore={vi.fn()}
rateLimitedUntil={null}
      />,
    );
expect(screen.queryByTestId("feed-load-more")).toBeNull();
expect(container.firstChild).toBeNull();
  });

it("renders an enabled Load more button by default", () => {
render(
<FeedLoadMore
hasMore={true}
isLoadingMore={false}
onLoadMore={vi.fn()}
rateLimitedUntil={null}
      />,
    );
const root = screen.getByTestId("feed-load-more");
expect(root.getAttribute("data-load-more-branch")).toBe("enabled");
const button = screen.getByTestId("feed-load-more-button");
expect(button.getAttribute("disabled")).toBeNull();
expect(button.textContent).toBe("Load more");
  });

it("renders a disabled Loading button when isLoadingMore is true", () => {
render(
<FeedLoadMore
hasMore={true}
isLoadingMore={true}
onLoadMore={vi.fn()}
rateLimitedUntil={null}
      />,
    );
const root = screen.getByTestId("feed-load-more");
expect(root.getAttribute("data-load-more-branch")).toBe("loading");
const button = screen.getByTestId("feed-load-more-button-loading");
expect(button.getAttribute("disabled")).not.toBeNull();
  });

it("renders a disabled Try again in N seconds button when rate-limited", () => {
const until = Date.now() + 30_000;
render(
<FeedLoadMore
hasMore={true}
isLoadingMore={false}
onLoadMore={vi.fn()}
rateLimitedUntil={until}
      />,
    );
const root = screen.getByTestId("feed-load-more");
expect(root.getAttribute("data-load-more-branch")).toBe("rate-limited");
const button = screen.getByTestId("feed-load-more-button-rate-limited");
expect(button.getAttribute("disabled")).not.toBeNull();
expect(button.textContent).toMatch(/Try again in \d+/);
  });

it("calls onLoadMore when the Load more button is clicked", () => {
const onLoadMore = vi.fn();
render(
<FeedLoadMore
hasMore={true}
isLoadingMore={false}
onLoadMore={onLoadMore}
rateLimitedUntil={null}
      />,
    );
screen.getByTestId("feed-load-more-button").click();
expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

it("decrements the rate-limit countdown every second", () => {
vi.useFakeTimers();
try {
const until = Date.now() + 30_000;
render(
<FeedLoadMore
hasMore={true}
isLoadingMore={false}
onLoadMore={vi.fn()}
rateLimitedUntil={until}
        />,
      );
const root = screen.getByTestId("feed-load-more");
const initialSeconds = Number(
root.getAttribute("data-seconds-remaining"),
      );
expect(initialSeconds).toBeGreaterThan(0);
act(() => {
vi.advanceTimersByTime(1000);
      });
const nextSeconds = Number(
screen.getByTestId("feed-load-more").getAttribute("data-seconds-remaining"),
      );
expect(nextSeconds).toBeLessThan(initialSeconds);
    } finally {
vi.useRealTimers();
    }
  });
});